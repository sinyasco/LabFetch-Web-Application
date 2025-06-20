import requests
import time
import json
import pandas as pd
from orcid_2 import get_orcid_from_name
import re
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
from c import get_chercheur_lmcs_names  # assuming your DB script is saved as get_db_authors.py
import os
import sys
from dgrsdt import scrape_dgrsdt
from urllib.parse import quote
import urllib3
import logging
from contextlib import contextmanager
from datetime import datetime

# Prevent Unicode errors by forcing terminal encoding
import io
import sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

"""Context manager for Chrome WebDriver to ensure proper cleanup"""
# Fix the path issue by using absolute path
script_dir = os.path.dirname(os.path.abspath(__file__))
chromedriver_path = os.path.join(script_dir, 'chromedriver.exe')
    
chrome_service = Service(chromedriver_path)
chrome_options = Options()
chrome_options.add_argument("--headless")
chrome_options.add_argument("--no-sandbox")
chrome_options.add_argument("--disable-dev-shm-usage")
chrome_options.add_argument("--ignore-certificate-errors")
chrome_options.add_argument("--disable-blink-features=AutomationControlled")

driver = webdriver.Chrome(service=chrome_service, options=chrome_options)
wait = WebDriverWait(driver, 15)

def get_journal_scope(journal_url):
    """Fetch the Scope section of a journal from ScimagoJR"""
    driver.get(journal_url)
    time.sleep(2)

    try:
        page_source = driver.page_source
        soup = BeautifulSoup(page_source, "html.parser")

        scope_header = soup.find("h2", string=lambda text: text and "Scope" in text)
        if scope_header:
            scope_text = scope_header.find_next_sibling(string=True)
            if scope_text:
                return scope_text.strip()

        return "Scope not found"
    except Exception as e:
        return f"Error extracting scope: {str(e)}"


def extract_subject_area_and_category():
    try:
        container = driver.find_element(By.XPATH, "//h2[contains(text(), 'Subject Area and Category')]/following-sibling::p/following-sibling::ul")
        subject_tree = {}

        def parse_list(ul_element):
            items = {}
            li_elements = ul_element.find_elements(By.XPATH, "./li")
            for li in li_elements:
                try:
                    a_tag = li.find_element(By.TAG_NAME, "a")
                    category = a_tag.text.strip()
                    sub_ul = li.find_elements(By.TAG_NAME, "ul")
                    if sub_ul:
                        items[category] = parse_list(sub_ul[0])
                    else:
                        items[category] = []
                except:
                    continue
            return items

        subject_tree = parse_list(container)
        return subject_tree
    except Exception as e:
        print(f"Error extracting Subject Area and Category: {e}")
        return "Not found"

def fetch_journal_details(journal_name):
    """Fetch details of a journal from ScimagoJR"""
    search_url = f"https://www.scimagojr.com/journalsearch.php?q={journal_name.replace(' ', '+')}"
    driver.get(search_url)

    try:
        # Find first journal link
        link = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, ".search_results a")))
        journal_url = link.get_attribute("href")
        journal_title = link.text.strip()

        print(f"Found Journal: {journal_title}")
        print(f"URL: {journal_url}")

        details = {
            "title": journal_title,
            "url": journal_url,
            "scope": get_journal_scope(journal_url),
        }

        # Extract additional metadata
        def get_text_by_h2(header_text):
            """Helper function to extract text based on the h2 header"""
            try:
                element = driver.find_element(By.XPATH, f"//h2[contains(text(), '{header_text}')]/following-sibling::p")
                return element.text.strip()
            except:
                return None
            
          
        details["subject_area_and_category"] = extract_subject_area_and_category()
        details["subject_area"] = get_text_by_h2("Subject Area and Category")
        details["country"] = get_text_by_h2("Country")
        details["publisher"] = get_text_by_h2("Publisher")
        details["h_index"] = get_text_by_h2("H-Index")
        details["publication_type"] = get_text_by_h2("Publication type")
        details["issn"] = get_text_by_h2("ISSN")
        details["coverage"] = get_text_by_h2("Coverage")
        details["information"] = get_text_by_h2("Information")

        # Check if the journal is a conference or a journal
        publication_type = details.get("publication_type", "").lower()

        if "conference" not in publication_type:
            # Extract **only the latest** Quartile data
            try:
                table_button = driver.find_element(By.CSS_SELECTOR, ".combo_button.table_button")
                table_button.click()
                time.sleep(2)

                # Wait for the table to load
                wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "table tbody tr")))

                rows = driver.find_elements(By.CSS_SELECTOR, "table tbody tr")

                latest_year = None
                latest_quartile = None

                for row in rows:
                    columns = row.find_elements(By.TAG_NAME, "td")
                    if len(columns) >= 3:  # Ensure enough columns exist
                        year_text = columns[1].text.strip()  # Year column
                        quartile_text = columns[2].text.strip()  # Quartile column

                        # Ensure quartile is in proper format
                        match = re.search(r'Q[1-4]', quartile_text)
                        if match:
                            quartile = match.group()
                        else:
                            quartile = "Invalid Quartile"

                        if year_text.isdigit():
                            year = int(year_text)
                            if latest_year is None or year > latest_year:
                                latest_year = year
                                latest_quartile = {"year": str(year), "quartile": quartile}

                details["quartiles"] = latest_quartile if latest_quartile else "No quartile data available"
            except Exception as e:
                print(f"Error extracting quartiles: {e}")
                details["quartiles"] = "No quartile data available"
        else:
            # If it's a conference, don't fetch quartiles
            details["quartiles"] = "N/A (Conference/Proceedings)"

        return details

    except Exception as e:
        print(f"Error fetching journal details: {str(e)}")
        return None


list_LMCS = {"BALLA Amar","Kermi Adel"}

def get_data(query, target_year=None):
    """
    Fetch publication data from DBLP for a specific author query.
    
    Args:
        query (str): The author name to search for
        target_year (str or int, optional): Filter publications to this specific year
    
    Returns:
        list: List of publications matching the criteria
    """
    all_publications = []
    page_size = 100
    offset = 0
    retries = 5
    base_delay = 2  # Base delay in seconds for exponential backoff
    
    # Convert target_year to string for consistent comparison
    if target_year is not None:
        target_year = str(target_year)
        print(f"\n[INFO] Collecting DBLP publication data for year {target_year}")
    
    while True:
        url = f"https://dblp.org/search/publ/api?q={query}&format=json&h={page_size}&f={offset}"
        current_delay = base_delay
        success = False
        
        for attempt in range(retries):
            try:
                print(f"Fetching page {offset//page_size + 1} from DBLP API...")
                response = requests.get(url)
                if response.status_code == 429:
                    print(f"Rate limited (429). Attempt {attempt + 1}. Waiting {current_delay}s")
                    time.sleep(current_delay)
                    current_delay *= 2  # Exponential backoff
                    continue
                response.raise_for_status()
                data = response.json()
                result = data.get("result", {})
                hits = result.get("hits", {})
                publications = hits.get("hit", [])

                if not publications:
                    print(f"No more results found after {len(all_publications)} publications")
                    return all_publications  # Exit when no more results
                
                for pub in publications:
                    info = pub.get("info", {})
                    pub_year = str(info.get("year", ""))
                    
                    # Skip publications that don't match the target year
                    if target_year is not None and pub_year != target_year:
                        continue
                    
                    authors = info.get("authors", {}).get("author", [])
                    author_list = [a.get("text", "") for a in (authors if isinstance(authors, list) else [authors])]
                    venue_name = info.get("venue", "").strip()
                    
                    print(f"Processing publication: {info.get('title', '')[:50]}... ({pub_year})")
                    
                    # Fetch venue details only if we're keeping this publication
                    venue_details = fetch_journal_details(venue_name) if venue_name else None
                    venue_details_2 = scrape_dgrsdt(venue_name) if venue_name else None

                    publication = {
                        "title": info.get("title", ""),
                        "authors": author_list,
                        "year": pub_year,
                        "venue": venue_name,
                        "venue_details": {"scimago": venue_details, "dgrsdt": venue_details_2},
                        "volume": info.get("volume", ""),
                        "pages": info.get("pages", ""),
                        "number": info.get("number",""),
                        "type": info.get("type", ""),
                        "access": info.get("access", ""),
                        "key": info.get("key", ""),
                        "doi": info.get("doi", ""),
                        "ee": info.get("ee", ""),
                        "url": info.get("url", "")
                    }
                    all_publications.append(publication)
                    print(f"Added publication from {pub_year}")
                
                offset += page_size
                success = True
                time.sleep(1)
                break
            
            except Exception as e:
                print(f"Error: {e}")
                time.sleep(current_delay)
                current_delay *= 2
        
        if not success:
            print("Maximum retries exceeded. Stopping.")
            break
    
    print(f"Found {len(all_publications)} publications for query '{query}'{f' in year {target_year}' if target_year else ''}")
    return all_publications

def collect_dblp_data(save_to_file=True, filename=None, target_year=None):
    """
    Collect DBLP publication data for all researchers in the team.
    
    Args:
        save_to_file (bool): Whether to save the results to a JSON file.
        filename (str, optional): Custom filename for the output. If None, a default name will be used.
        target_year (int, optional): Filter publications to this specific year.
                                    If None, will use the current year.
    
    Returns:
        dict: Dictionary containing all authors and their publications.
    """
    data = []
    
    # Use the current year if target_year is not provided
    if target_year is None:
        target_year = datetime.now().year
    
    if filename is None:
        filename = f"dblp_lmcs_{target_year}.json"

    folder_name = "AuthorsPublications"
    if save_to_file:
        os.makedirs(folder_name, exist_ok=True)
        full_path = os.path.join(folder_name, filename)
    else:
        full_path = filename

    print(f"\n[INFO] Collecting DBLP publication data for year {target_year}")
    chercheurs = get_chercheur_lmcs_names()

    for chercheur_id, nom_complet in chercheurs:
        parts = nom_complet.strip().split()
        if not parts:
            continue
        firstname = parts[0]
        lastname = parts[-1]
        full_name = f"{lastname} {firstname}"

        print(f"\n Fetching publications for: {full_name}")
        publications = get_data(full_name, target_year=target_year) or []
        orcid_id = get_orcid_from_name(full_name) or "Unknown"

        author_entry = {"name": full_name, "orcid_id": orcid_id, "publications": publications}
        data.append(author_entry)

        time.sleep(5)

    result_data = {"authors": data}
    
    if save_to_file:
        with open(full_path, "w", encoding="utf-8") as file:
            json.dump(result_data, file, indent=4, ensure_ascii=False)
        print(f"\nAll data saved to {full_path}")
        print(f"Collected {sum(len(author['publications']) for author in data)} publications across {len(data)} authors.")
    
    return result_data

# For backward compatibility
def save_data(filename=None, save_to_file=True):
    """Legacy function that calls collect_dblp_data with the same parameters"""
    # Default to current year
    current_year = datetime.now().year
    return collect_dblp_data(save_to_file=save_to_file, filename=filename, target_year=current_year)

if __name__ == "__main__":
    current_year = datetime.now().year
    collected_data = save_data(filename=f"publications_{current_year}.json")
    
    driver.quit()