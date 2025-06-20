import requests
import time
import json
import logging
import os
import sys
import traceback
from urllib.parse import quote
import re
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
import pandas as pd

# Set up logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                    handlers=[
                        logging.FileHandler("dblp_collector.log", encoding='utf-8'),
                        logging.StreamHandler()
                    ])
logger = logging.getLogger("DblpCollector")

def setup_webdriver():
    """Set up and return a configured Chrome WebDriver instance"""
    try:
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
        chrome_options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.71 Safari/537.36")
        
        driver = webdriver.Chrome(service=chrome_service, options=chrome_options)
        wait = WebDriverWait(driver, 15)
        logger.info("WebDriver initialized successfully")
        return driver, wait
    except Exception as e:
        logger.error(f"Failed to initialize WebDriver: {e}")
        raise

def get_journal_scope(driver, journal_url):
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
    """Extract subject area and category from the current page"""
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
        logger.error(f"Error extracting Subject Area and Category: {e}")
        return "Not found"

def fetch_journal_details(driver, wait, journal_name):
    """Fetch details of a journal from ScimagoJR"""
    if not journal_name or journal_name.strip() == "":
        logger.warning("Empty journal name provided, skipping journal details fetch")
        return None
    
    search_url = f"https://www.scimagojr.com/journalsearch.php?q={quote(journal_name.replace(' ', '+'))}"
    
    try:
        logger.info(f"Searching for journal: {journal_name}")
        driver.get(search_url)

        # Find first journal link with timeout handling
        try:
            link = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, ".search_results a")))
            journal_url = link.get_attribute("href")
            journal_title = link.text.strip()

            logger.info(f"Found Journal: {journal_title}")
            logger.info(f"URL: {journal_url}")

            details = {
                "title": journal_title,
                "url": journal_url,
                "scope": get_journal_scope(driver, journal_url),
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
            logger.warning(f"No journal found for '{journal_name}': {e}")
            return {
                "title": journal_name,
                "url": None,
                "scope": "Journal not found in Scimago database",
                "quartiles": "Not found"
            }

    except Exception as e:
        logger.error(f"Error fetching journal details for '{journal_name}': {str(e)}")
        return {
            "title": journal_name,
            "error": str(e)
        }

def get_dblp_data(query, target_year=None):
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
        logger.info(f"Collecting DBLP publication data for year {target_year}")
    
    while True:
        url = f"https://dblp.org/search/publ/api?q={quote(query)}&format=json&h={page_size}&f={offset}"
        current_delay = base_delay
        success = False
        
        for attempt in range(retries):
            try:
                logger.info(f"Fetching page {offset//page_size + 1} from DBLP API...")
                response = requests.get(url, timeout=30)
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
                    logger.info(f"No more results found after {len(all_publications)} publications")
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
                    
                    logger.info(f"Processing publication: {info.get('title', '')[:50]}... ({pub_year})")
                    
                    # Placeholder for venue details - will be filled later to avoid too many requests at once
                    publication = {
                        "title": info.get("title", ""),
                        "authors": author_list,
                        "year": pub_year,
                        "venue": venue_name,
                        "venue_details_to_fetch": True,  # Flag for later processing
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
                    logger.info(f"Added publication from {pub_year}")
                
                offset += page_size
                success = True
                time.sleep(1)
                break
            
            except Exception as e:
                logger.error(f"Error fetching DBLP data: {e}")
                time.sleep(current_delay)
                current_delay *= 2
        
        if not success:
            logger.error("Maximum retries exceeded. Stopping.")
            break
    
    logger.info(f"Found {len(all_publications)} publications for query '{query}'{f' in year {target_year}' if target_year else ''}")
    return all_publications

def process_venue_details(driver, wait, publications):
    """Process venue details for a list of publications"""
    unique_venues = set()
    venue_details_cache = {}
    
    # First, identify all unique venues
    for pub in publications:
        venue_name = pub.get('venue', '')
        if venue_name and pub.get('venue_details_to_fetch', False):
            unique_venues.add(venue_name)
    
    logger.info(f"Processing details for {len(unique_venues)} unique venues")
    
    # Process each unique venue
    for venue_name in unique_venues:
        try:
            logger.info(f"Fetching details for venue: {venue_name}")
            
            # Fetch Scimago details
            scimago_details = fetch_journal_details(driver, wait, venue_name)
            
            # Store in cache
            venue_details_cache[venue_name] = {
                "scimago": scimago_details
            }
            
            # Add delay to avoid overwhelming the servers
            time.sleep(2)
            
        except Exception as e:
            logger.error(f"Error fetching details for venue '{venue_name}': {e}")
            venue_details_cache[venue_name] = {
                "scimago": {"error": str(e)}
            }
    
    # Update each publication with their venue details
    for pub in publications:
        venue_name = pub.get('venue', '')
        if venue_name and pub.get('venue_details_to_fetch', False):
            pub['venue_details'] = venue_details_cache.get(venue_name, 
                                                          {"scimago": None})
            # Remove the flag
            pub.pop('venue_details_to_fetch', None)
    
    return publications

def collect_dblp_publications(authors, target_year=None, save_to_file=True, filename=None):
    """
    Collect DBLP publication data for a list of authors.
    
    Args:
        authors (list): List of author names to search for
        target_year (int, optional): Filter publications to this specific year
        save_to_file (bool): Whether to save the results to a JSON file
        filename (str, optional): Custom filename for the output
        
    Returns:
        dict: Dictionary containing all authors and their publications
    """
    # Set up WebDriver
    driver, wait = setup_webdriver()
    
    try:
        data = []
        
        # Use the current year if target_year is not provided
        if target_year is None:
            target_year = datetime.now().year
        
        if filename is None:
            filename = f"dblp_publications_{target_year}.json"

        folder_name = "Publications"
        if save_to_file:
            os.makedirs(folder_name, exist_ok=True)
            full_path = os.path.join(folder_name, filename)
        else:
            full_path = filename

        logger.info(f"\n[INFO] Collecting DBLP publication data for year {target_year}")

        for full_name in authors:
            logger.info(f"\n Fetching publications for: {full_name}")
            publications = get_dblp_data(full_name, target_year=target_year) or []

            # Process venue details for all publications
            if publications:
                publications = process_venue_details(driver, wait, publications)

            author_entry = {"name": full_name, "publications": publications}
            data.append(author_entry)

            time.sleep(3)  # Be nice to the DBLP server

        result_data = {"authors": data}
        
        if save_to_file:
            with open(full_path, "w", encoding="utf-8") as file:
                json.dump(result_data, file, indent=4, ensure_ascii=False)
            logger.info(f"\nAll data saved to {full_path}")
            logger.info(f"Collected {sum(len(author['publications']) for author in data)} publications across {len(data)} authors.")
        
        return result_data
    finally:
        # Always close the WebDriver
        driver.quit()
        logger.info("WebDriver closed")

def export_to_excel(data, year, filename=None):
    """
    Export publication data to Excel.
    
    Args:
        data (dict): Publication data
        year (int): Target year
        filename (str, optional): Custom filename for Excel output
        
    Returns:
        str: Path to the saved Excel file
    """
    if filename is None:
        filename = f"DBLP_Publications_{year}.xlsx"
    
    try:
        # Extract all publications into a flat list
        all_pubs = []
        for author in data["authors"]:
            for pub in author["publications"]:
                pub_copy = pub.copy()
                pub_copy['author'] = author['name']
                
                # Extract venue details if available
                if 'venue_details' in pub_copy and 'scimago' in pub_copy['venue_details']:
                    scimago = pub_copy['venue_details']['scimago']
                    if scimago:
                        pub_copy['journal_quartile'] = scimago.get('quartiles', {}).get('quartile', 'Unknown') \
                            if isinstance(scimago.get('quartiles'), dict) else scimago.get('quartiles', 'Unknown')
                        pub_copy['publication_type'] = scimago.get('publication_type', 'Unknown')
                
                all_pubs.append(pub_copy)
        
        # Create DataFrame
        df = pd.DataFrame(all_pubs)
        
        # Select and reorder columns
        important_columns = ['author', 'title', 'year', 'venue', 'type', 'doi', 'volume', 'number', 'pages']
        optional_columns = ['journal_quartile', 'publication_type', 'authors', 'url']
        
        columns_to_use = [col for col in important_columns + optional_columns if col in df.columns]
        
        # Save to Excel
        df[columns_to_use].to_excel(filename, index=False)
        logger.info(f"Data exported to Excel: {filename}")
        return filename
    
    except Exception as e:
        logger.error(f"Error exporting to Excel: {e}")
        traceback.print_exc()
        return None

def main():
    """Main function to demonstrate usage"""
    try:
        # Example authors list (replace with your own list or loading from file)
        authors = [
            "John Smith",
            "Jane Doe",
            "Michael Johnson"
        ]
        
        # Parse command-line arguments for year
        import argparse
        parser = argparse.ArgumentParser(description='Collect DBLP publication data')
        parser.add_argument('--year', type=int, default=datetime.now().year,
                            help='Target year (default: current year)')
        parser.add_argument('--authors-file', type=str,
                            help='Path to a text file with author names (one per line)')
        parser.add_argument('--output', type=str,
                            help='Output filename for JSON data')
        args = parser.parse_args()
        
        # Load authors from file if specified
        if args.authors_file:
            try:
                with open(args.authors_file, 'r', encoding='utf-8') as f:
                    authors = [line.strip() for line in f if line.strip()]
                logger.info(f"Loaded {len(authors)} authors from {args.authors_file}")
            except Exception as e:
                logger.error(f"Error loading authors file: {e}")
                return
        
        # Collect publication data
        data = collect_dblp_publications(
            authors=authors,
            target_year=args.year,
            save_to_file=True,
            filename=args.output
        )
        
        # Export to Excel
        excel_file = export_to_excel(data, args.year)
        if excel_file:
            logger.info(f"Process completed successfully. Excel report: {excel_file}")
        
    except Exception as e:
        logger.error(f"Error in main function: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    main()