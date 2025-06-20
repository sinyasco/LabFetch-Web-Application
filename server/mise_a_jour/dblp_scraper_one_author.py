import requests
import time
import json
import pandas as pd
import re
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
import os
from urllib.parse import quote
import urllib3
import logging
from contextlib import contextmanager

# Import the functions from other files
try:
    from orcid_2 import get_orcid_from_name
    from dgrsdt import scrape_dgrsdt
except ImportError:
    print("Warning: Could not import one or more required modules.")

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Disable SSL warnings while still allowing insecure requests when needed
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

@contextmanager
def get_webdriver():
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
    
    driver = None
    try:
        driver = webdriver.Chrome(service=chrome_service, options=chrome_options)
        wait = WebDriverWait(driver, 15)
        yield driver, wait
    finally:
        if driver:
            driver.quit()

def get_journal_scope(driver, wait, journal_url):
    """Fetch the Scope section of a journal from ScimagoJR"""
    try:
        driver.get(journal_url)
        time.sleep(2)

        page_source = driver.page_source
        soup = BeautifulSoup(page_source, "html.parser")

        scope_header = soup.find("h2", string=lambda text: text and "Scope" in text)
        if scope_header:
            scope_text = scope_header.find_next_sibling(string=True)
            if scope_text:
                return scope_text.strip()

        return "Scope not found"
    except Exception as e:
        logger.error(f"Error extracting scope: {str(e)}")
        return f"Error extracting scope: {str(e)}"

def extract_subject_area_and_category(driver):
    try:
        container = driver.find_element(By.XPATH, "//h2[contains(text(), 'Subject Area and Category')]/following-sibling::p/following-sibling::ul")
        
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
        logger.error(f"Error extracting Subject Area and Category: {e}")
        return "Not found"

def fetch_journal_details(driver, wait, journal_name):
    """Fetch details of a journal from ScimagoJR"""
    if not journal_name or journal_name.strip() == "":
        return None
        
    search_url = f"https://www.scimagojr.com/journalsearch.php?q={journal_name.replace(' ', '+')}"
    
    try:
        driver.get(search_url)

        # Find first journal link
        try:
            link = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, ".search_results a")))
            journal_url = link.get_attribute("href")
            journal_title = link.text.strip()

            logger.info(f"Found Journal: {journal_title}")
            logger.info(f"URL: {journal_url}")

            details = {
                "title": journal_title,
                "url": journal_url,
                "scope": get_journal_scope(driver, wait, journal_url),
            }

            # Extract additional metadata
            def get_text_by_h2(header_text):
                """Helper function to extract text based on the h2 header"""
                try:
                    element = driver.find_element(By.XPATH, f"//h2[contains(text(), '{header_text}')]/following-sibling::p")
                    return element.text.strip()
                except:
                    return None
                
            details["subject_area_and_category"] = extract_subject_area_and_category(driver)
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
                    logger.error(f"Error extracting quartiles: {e}")
                    details["quartiles"] = "No quartile data available"
            else:
                # If it's a conference, don't fetch quartiles
                details["quartiles"] = "N/A (Conference/Proceedings)"

            return details

        except Exception as e:
            logger.error(f"No journal found for {journal_name}: {str(e)}")
            return None

    except Exception as e:
        logger.error(f"Error fetching journal details: {str(e)}")
        return None

def get_data(query):
    all_publications = []
    page_size = 100
    offset = 0
    retries = 5
    base_delay = 2  # Base delay in seconds for exponential backoff
    
    with get_webdriver() as (driver, wait):
        while True:
            url = f"https://dblp.org/search/publ/api?q={query}&format=json&h={page_size}&f={offset}"
            current_delay = base_delay
            success = False
            
            for attempt in range(retries):
                try:
                    response = requests.get(url)
                    if response.status_code == 429:
                        logger.warning(f"Rate limited (429). Attempt {attempt + 1}. Waiting {current_delay}s")
                        time.sleep(current_delay)
                        current_delay *= 2  # Exponential backoff
                        continue
                    response.raise_for_status()
                    data = response.json()
                    result = data.get("result", {})
                    hits = result.get("hits", {})
                    publications = hits.get("hit", [])

                    if not publications:
                        logger.info(f"No more publications found after {len(all_publications)} items")
                        return all_publications  # Exit when no more results
                    
                    for pub in publications:
                        info = pub.get("info", {})
                        authors = info.get("authors", {}).get("author", [])
                        author_list = [a.get("text", "") for a in (authors if isinstance(authors, list) else [authors])]
                        venue_name = info.get("venue", "").strip()
                        venue_details = fetch_journal_details(driver, wait, venue_name) if venue_name else None
                        venue_details_2 = scrape_dgrsdt(venue_name) if venue_name else None

                        publication = {
                            "title": info.get("title", ""),
                            "authors": author_list,
                            "year": info.get("year", ""),
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
                    
                    offset += page_size
                    success = True
                    time.sleep(1)
                    break
                
                except Exception as e:
                    logger.error(f"Error: {e}")
                    time.sleep(current_delay)
                    current_delay *= 2
            
            if not success:
                logger.error("Maximum retries exceeded. Stopping.")
                break
    
    return all_publications

def get_author_publication_data(firstname, lastname, output_filename=None):
    data = []

    folder_name = "AuthorsPublications"
    os.makedirs(folder_name, exist_ok=True)


    full_name = f"{firstname} {lastname}"

    #full_name = f"{lastname} {firstname}"

    logger.info(f"Fetching publications for: {full_name}")

    publications = get_data(full_name) or []
    orcid_id = get_orcid_from_name(full_name) or "Unknown"

    author_entry = {
        "name": full_name,
        "orcid_id": orcid_id,
        "publications": publications
    }
    data.append(author_entry)

    # If output filename is provided, save as JSON
    if output_filename:
        output_path = os.path.join(folder_name, output_filename) if not os.path.dirname(output_filename) else output_filename
        with open(output_path, "w", encoding="utf-8") as file:
            json.dump({"authors": data}, file, indent=4, ensure_ascii=False)
        logger.info(f"JSON saved to {output_path}")
    
    return data

# Only executed when run directly
if __name__ == "__main__":
    import sys
    if len(sys.argv) < 3:
        print("Usage: python dblp_scraper_one_author.py firstname lastname [output_filename]")
        sys.exit(1)
    
    firstname = sys.argv[1]
    lastname = sys.argv[2]
    output_filename = sys.argv[3] if len(sys.argv) > 3 else f"output_dblp.json"
    
    result = get_author_publication_data(firstname, lastname, output_filename)
    # Print JSON for Node.js to read
    print(json.dumps(result, ensure_ascii=False, indent=2))