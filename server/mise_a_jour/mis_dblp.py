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
from scholarly import scholarly, MaxTriesExceededException
from concurrent.futures import ThreadPoolExecutor
import logging
import os
import sys
import traceback
from urllib.parse import quote
import urllib3
from contextlib import contextmanager
from datetime import datetime
import io
import locale
import codecs

# Set up logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                    handlers=[
                        logging.FileHandler("publication_collector.log", encoding='utf-8'),
                        logging.StreamHandler()
                    ])
logger = logging.getLogger("PublicationCollector")

# Prevent Unicode errors by forcing terminal encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Print debug information
logger.info(f"Python version: {sys.version}")
logger.info(f"Current directory: {os.getcwd()}")
logger.info(f"System encoding: {sys.getdefaultencoding()}")
logger.info(f"Locale encoding: {locale.getpreferredencoding()}")

# Import custom modules with error handling
try:
    from c import get_chercheur_lmcs_names
    logger.info("Successfully imported get_chercheur_lmcs_names function")
except ImportError as e:
    logger.error(f"Error importing c module: {e}")
    # Fallback function for testing
    def get_chercheur_lmcs_names():
        logger.warning("Using test data for author names")
        return [
            (1, "John Smith"),
            (2, "Jane Doe"),
            (3, "Michael Johnson")
        ]

try:
    from orcid_2 import get_orcid_from_name
    logger.info("Successfully imported get_orcid_from_name function")
except ImportError as e:
    logger.error(f"Error importing orcid_2 module: {e}")
    # Fallback function for testing
    def get_orcid_from_name(name):
        logger.warning(f"Using dummy ORCID for {name}")
        return "0000-0000-0000-0000"

try:
    from dgrsdt import scrape_dgrsdt
    logger.info("Successfully imported scrape_dgrsdt function")
except ImportError as e:
    logger.error(f"Error importing dgrsdt module: {e}")
    # Fallback function for testing
    def scrape_dgrsdt(venue_name):
        logger.warning(f"Using dummy DGRSDT data for {venue_name}")
        return {"found": False, "rank": "Unknown", "info": "Module not available"}

# WebDriver setup with better error handling
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

def extract_publication_info(pub, target_year=None):
    """Extract publication info from Google Scholar search result"""
    try:
        scholarly.fill(pub)
        bib = pub.get('bib', {})
        
        # Extract the year first to allow early validation
        pub_year = bib.get('year') or bib.get('pub_year')
        
        # If a target year is provided, check if this publication matches the target year
        if target_year is not None:
            if not pub_year or str(pub_year) != str(target_year):
                logger.info(f"   Skipping publication from year {pub_year} (target: {target_year})")
                return None
        
        # Continue with extraction only if year matches or no target year
        abstract = bib.get('abstract') or bib.get('summary') or bib.get('description') or "No description available"
        venue = bib.get('conference') or bib.get('journal') or bib.get('venue') or "Unknown venue"
        etablissement = pub.get('institution') or pub.get('affiliation') or "Unknown établissement"
        
        publication_info = {
            'title': bib.get('title', 'Untitled'),
            'year': pub_year,
            'venue': venue,
            'type': bib.get('type', 'Unknown type'),
            'pages': bib.get('pages'),
            'doi': bib.get('doi'),
            'url': pub.get('pub_url', pub.get('eprint_url', None)),
            'authors': bib.get('author', '').split(' and ') if isinstance(bib.get('author', ''), str) else [],
            'citations': pub.get('num_citations', 0),
            'publisher': bib.get('publisher', 'Unknown publisher'),
            'institution': etablissement,
            'abstract': abstract,
            'number': bib.get('number', None),
            'volume': bib.get('volume'),
            'venue_details_to_fetch': True  # Flag for later processing
        }
        
        logger.info(f"   Added publication: {publication_info['title'][:50]}... ({pub_year})")
        return publication_info
    except Exception as e:
        logger.error(f"   Error processing publication: {str(e)}")
        return None

def get_author_profile(name, lastname, target_year=None):
    """Get author profile from Google Scholar"""
    try:
        logger.info(f"\n Searching for author: {name}...")
        search_query = scholarly.search_author(name)
        author = next(search_query, None)
        
        if not author:
            logger.warning(f" No exact profile found for {name}. Checking alternative matches...")
            
            for alt_author in search_query:
                alt_name = alt_author.get('name', '').lower()
                if lastname.lower() in alt_name:
                    logger.info(f" Found a match based on last name: {alt_author['name']}")
                    author = alt_author
                    break
            
            if not author:
                logger.warning(f" No profile found for {name} or related names")
                return None
        
        scholarly.fill(author, sections=['basics', 'indices', 'counts', 'publications'])
        profile = {
            'name': name,
            'affiliation': author.get('affiliation', 'Unknown Affiliation'),
            'profile_url': author.get('url', f"https://scholar.google.com/citations?user={author.get('scholar_id', '')}"),
            'interests': author.get('interests', []),
            'citation_stats': {
                'total_citations': author.get('citedby', 0),
                'h_index': author.get('hindex', 0),
                'i10_index': author.get('i10index', 0)
            },
            'publications': []
        }
        
        logger.info(f" Processing publications for {name} (target year: {target_year})...")
        publications = []
        
        # Apply target_year filter directly in extract_publication_info
        with ThreadPoolExecutor(max_workers=5) as executor:
            # Pass target_year to extract_publication_info function
            extraction_tasks = []
            for pub in author.get('publications', []):
                extraction_tasks.append(executor.submit(extract_publication_info, pub, target_year))
            
            # Get results from completed tasks
            for task in extraction_tasks:
                pub_info = task.result()
                if pub_info:  # Only add valid publications
                    publications.append(pub_info)
        
        profile['publications'] = publications
        logger.info(f" Found {len(publications)} publications for {name} in year {target_year}")
        
        return profile
    except MaxTriesExceededException:
        logger.warning(f" Max tries exceeded for {name}, retrying after delay...")
        time.sleep(30)
        return get_author_profile(name, lastname, target_year)
    except Exception as e:
        logger.error(f" Error processing {name}: {str(e)}")
        traceback.print_exc()
        return None

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
            
            # Fetch DGRSDT details
            dgrsdt_details = scrape_dgrsdt(venue_name)
            
            # Store in cache
            venue_details_cache[venue_name] = {
                "scimago": scimago_details,
                "dgrsdt": dgrsdt_details
            }
            
            # Add delay to avoid overwhelming the servers
            time.sleep(2)
            
        except Exception as e:
            logger.error(f"Error fetching details for venue '{venue_name}': {e}")
            venue_details_cache[venue_name] = {
                "scimago": {"error": str(e)},
                "dgrsdt": {"error": str(e)}
            }
    
    # Update each publication with their venue details
    for pub in publications:
        venue_name = pub.get('venue', '')
        if venue_name and pub.get('venue_details_to_fetch', False):
            pub['venue_details'] = venue_details_cache.get(venue_name, 
                                                          {"scimago": None, "dgrsdt": None})
            # Remove the flag
            pub.pop('venue_details_to_fetch', None)
    
    return publications

def collect_dblp_data(driver, wait, save_to_file=True, filename=None, target_year=None):
    """
    Collect DBLP publication data for all researchers in the team.
    
    Args:
        driver: WebDriver instance
        wait: WebDriverWait instance  
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
        filename = f"dblp_lmcs_2_{target_year}.json"

    folder_name = "AuthorsPublications"
    if save_to_file:
        os.makedirs(folder_name, exist_ok=True)
        full_path = os.path.join(folder_name, filename)
    else:
        full_path = filename

    logger.info(f"\n[INFO] Collecting DBLP publication data for year {target_year}")
    chercheurs = get_chercheur_lmcs_names()
    i = 0
    for chercheur_id, nom_complet in chercheurs:
        parts = nom_complet.strip().split()
        if not parts: 
            continue
        firstname = parts[0]
        lastname = parts[-1]
        full_name = f"{lastname} {firstname}"
        i += 1
        print(i)
        logger.info(f"\n Fetching publications for: {full_name}")
        publications = get_dblp_data(full_name, target_year=target_year) or []
        orcid_id = get_orcid_from_name(full_name) or "Unknown"

        # Process venue details for all publications
        if publications:
            publications = process_venue_details(driver, wait, publications)

        author_entry = {"name": full_name, "orcid_id": orcid_id, "publications": publications}
        data.append(author_entry)

        time.sleep(5)

    result_data = {"authors": data}
    
    if save_to_file:
        with open(full_path, "w", encoding="utf-8") as file:
            json.dump(result_data, file, indent=4, ensure_ascii=False)
        logger.info(f"\nAll data saved to {full_path}")
        logger.info(f"Collected {sum(len(author['publications']) for author in data)} publications across {len(data)} authors.")
    
    return result_data

def collect_research_data(driver, wait, year=None, save_to_file=True):
    """
    Collect research data for all researchers in the team from Google Scholar.
    
    Args:
        driver: WebDriver instance
        wait: WebDriverWait instance
        year (int, optional): Filter publications to this specific year. 
                             If None, all publications will be included.
        save_to_file (bool): Whether to save the results to a JSON file.
    
    Returns:
        list: List of researcher profiles with their publications.
    """
    try:
        research_team = []
        current_year = datetime.now().year if year is None else year
        logger.info(f"Getting list of researchers for year {current_year}...")
        
        try:
            chercheurs = get_chercheur_lmcs_names()
            logger.info(f"Found {len(chercheurs)} researchers")
        except Exception as e:
            logger.error(f"Error getting researcher names: {str(e)}")
            traceback.print_exc()
            # Use test data as fallback
            chercheurs = [
                (1, "John Smith"),
                (2, "Jane Doe"),
                (3, "Michael Johnson")
            ]
            logger.info(f"Using {len(chercheurs)} test researchers instead")

        # Process only a few researchers if debugging
        debug_mode = False
        if debug_mode:
            chercheurs = chercheurs[:2]  # Process only first 2 researchers
            logger.info("DEBUG MODE: Processing only first 2 researchers")

        for chercheur_id, full_name in chercheurs:
            parts = full_name.strip().split()
            if not parts:
                logger.warning(f"Skipping researcher with invalid name: '{full_name}'")
                continue
                
            firstname = parts[0]
            lastname = parts[-1]

            logger.info(f"\n Processing {full_name}...")
            start_time = time.time()
            profile = get_author_profile(full_name, lastname, target_year=current_year)

            if profile and profile['publications']:
                # Process venue details for all publications
                profile['publications'] = process_venue_details(driver, wait, profile['publications'])
                research_team.append(profile)
                logger.info(f" Captured {len(profile['publications'])} publications in {time.time()-start_time:.1f}s")
            else:
                logger.warning(f" No Google Scholar profile or publications found for {full_name}")

            # Shorter delay in debug mode
            delay = 2 if debug_mode else 5
            logger.info(f"Waiting {delay}s before next researcher...")
            time.sleep(delay)

        if save_to_file:
            # Save to current directory and to specified directory
            output_file = f"research_team_{current_year}.json"
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(research_team, f, ensure_ascii=False, indent=2)
                
            logger.info(f"\n Final dataset contains {sum(len(a['publications']) for a in research_team)} publications across {len(research_team)} authors.")
            logger.info(f" Data saved to {output_file}")

            # Write a simple status file to indicate completion
            with open(f"status_{current_year}.txt", 'w', encoding='utf-8') as f:
                f.write(f"Complete: {len(research_team)} researchers, {sum(len(a['publications']) for a in research_team)} publications")

        return research_team
    except Exception as e:
        logger.error(f"Fatal error in collect_research_data: {str(e)}")
        traceback.print_exc()
        
        # Write error to a file that can be checked
        with open("error_log.txt", 'w', encoding='utf-8') as f:
            f.write(f"Error: {str(e)}\n\n")
            f.write(traceback.format_exc())
            
        return []

def merge_publication_data(dblp_data, scholar_data):
    """
    Merge publication data from DBLP and Google Scholar.
    
    Args:
        dblp_data (dict): Dictionary containing DBLP author data
        scholar_data (list): List of Google Scholar author profiles
    
    Returns:
        dict: Merged publication data
    """
    merged_data = {"authors": []}
    
    # Create a mapping of author names
    dblp_authors = {author["name"]: author for author in dblp_data["authors"]}
    scholar_authors = {author["name"]: author for author in scholar_data}
    
    # Get all unique author names
    all_author_names = set(list(dblp_authors.keys()) + list(scholar_authors.keys()))
    
    for author_name in all_author_names:
        dblp_author = dblp_authors.get(author_name)
        scholar_author = scholar_authors.get(author_name)
        
        merged_author = {
            "name": author_name,
            "orcid_id": dblp_author.get("orcid_id") if dblp_author else "Unknown",
            "publications": [],
            "scholar_profile": scholar_author.get("profile_url") if scholar_author else None,
            "citation_stats": scholar_author.get("citation_stats") if scholar_author else None
        }
        
        # Create a set of publication titles for deduplication
        publication_titles = set()
        
        # Add DBLP publications
        if dblp_author:
            for pub in dblp_author.get("publications", []):
                pub_title = pub.get("title", "").lower()
                if pub_title not in publication_titles:
                    publication_titles.add(pub_title)
                    pub["source"] = "DBLP"
                    merged_author["publications"].append(pub)
        
        # Add Google Scholar publications (avoiding duplicates)
        if scholar_author:
            for pub in scholar_author.get("publications", []):
                pub_title = pub.get("title", "").lower()
                # Check for similar titles using fuzzy matching
                is_duplicate = False
                for existing_title in publication_titles:
                    # Simple similarity check: if one is completely contained in the other
                    if pub_title in existing_title or existing_title in pub_title:
                        is_duplicate = True
                        break
                
                if not is_duplicate:
                    publication_titles.add(pub_title)
                    pub["source"] = "Google Scholar"
                    merged_author["publications"].append(pub)
        
        merged_data["authors"].append(merged_author)
    
    return merged_data

def generate_publication_summary(merged_data, year):
    """
    Generate a summary of publications for the specified year.
    
    Args:
        merged_data (dict): Merged publication data
        year (int): Target year
    
    Returns:
        dict: Publication statistics and summaries
    """
    summary = {
        "year": year,
        "total_authors": len(merged_data["authors"]),
        "total_publications": 0,
        "publication_types": {},
        "journal_stats": {},
        "conference_stats": {},
        "top_journals": [],
        "top_conferences": [],
        "author_stats": []
    }
    
    journals = {}
    conferences = {}
    authors_with_pubs = 0
    
    # Process each author's publications
    for author in merged_data["authors"]:
        author_pub_count = len(author["publications"])
        if author_pub_count > 0:
            authors_with_pubs += 1
            
            # Author-specific statistics
            author_summary = {
                "name": author["name"],
                "publication_count": author_pub_count,
                "journal_count": 0,
                "conference_count": 0,
                "other_count": 0,
                "citation_stats": author.get("citation_stats", {"total_citations": 0, "h_index": 0})
            }
            
            # Process each publication
            for pub in author["publications"]:
                summary["total_publications"] += 1
                
                # Publication type stats
                pub_type = pub.get("type", "Unknown").lower()
                summary["publication_types"][pub_type] = summary["publication_types"].get(pub_type, 0) + 1
                
                venue = pub.get("venue", "Unknown")
                venue_details = pub.get("venue_details", {})
                
                # Determine if journal or conference
                is_conference = False
                is_journal = False
                
                # Check by publication type
                if "conference" in pub_type or "proceedings" in pub_type:
                    is_conference = True
                    author_summary["conference_count"] += 1
                elif "journal" in pub_type or "article" in pub_type:
                    is_journal = True
                    author_summary["journal_count"] += 1
                # Check by venue details
                elif venue_details and venue_details.get("scimago"):
                    pub_type_info = venue_details["scimago"].get("publication_type", "").lower()
                    if "conference" in pub_type_info or "proceedings" in pub_type_info:
                        is_conference = True
                        author_summary["conference_count"] += 1
                    elif "journal" in pub_type_info:
                        is_journal = True
                        author_summary["journal_count"] += 1
                    else:
                        author_summary["other_count"] += 1
                else:
                    author_summary["other_count"] += 1
                
                # Collect journal and conference statistics
                if is_journal and venue:
                    if venue not in journals:
                        journals[venue] = {
                            "name": venue,
                            "count": 0,
                            "quartile": venue_details.get("scimago", {}).get("quartiles", "Unknown") 
                                        if venue_details else "Unknown",
                            "dgrsdt_rank": venue_details.get("dgrsdt", {}).get("rank", "Unknown") 
                                          if venue_details else "Unknown"
                        }
                    journals[venue]["count"] += 1
                    
                elif is_conference and venue:
                    if venue not in conferences:
                        conferences[venue] = {
                            "name": venue,
                            "count": 0,
                            "rank": venue_details.get("dgrsdt", {}).get("rank", "Unknown") 
                                   if venue_details else "Unknown"
                        }
                    conferences[venue]["count"] += 1
            
            # Add author summary
            summary["author_stats"].append(author_summary)
    
    # Get top journals and conferences
    summary["journal_stats"] = list(journals.values())
    summary["conference_stats"] = list(conferences.values())
    
    # Sort by count
    summary["journal_stats"].sort(key=lambda x: x["count"], reverse=True)
    summary["conference_stats"].sort(key=lambda x: x["count"], reverse=True)
    
    # Get top 5 journals and conferences
    summary["top_journals"] = summary["journal_stats"][:5]
    summary["top_conferences"] = summary["conference_stats"][:5]
    
    # Additional statistics
    summary["authors_with_publications"] = authors_with_pubs
    summary["avg_publications_per_author"] = summary["total_publications"] / max(1, summary["authors_with_publications"])
    
    return summary

def export_to_excel(merged_data, summary, year):
    """
    Export merged publication data and summary to Excel.
    
    Args:
        merged_data (dict): Merged publication data
        summary (dict): Publication summary
        year (int): Target year
    
    Returns:
        str: Path to the saved Excel file
    """
    filename = f"LMCS_Publications_{year}.xlsx"
    
    try:
        with pd.ExcelWriter(filename) as writer:
            # Summary sheet
            summary_data = {
                'Metric': [
                    'Year', 'Total Authors', 'Authors with Publications', 
                    'Total Publications', 'Avg Publications per Author'
                ],
                'Value': [
                    year, summary['total_authors'], summary['authors_with_publications'],
                    summary['total_publications'], f"{summary['avg_publications_per_author']:.2f}"
                ]
            }
            pd.DataFrame(summary_data).to_excel(writer, sheet_name='Summary', index=False)
            
            # Publication types sheet
            pub_types = [{'Type': k, 'Count': v} for k, v in summary['publication_types'].items()]
            pd.DataFrame(pub_types).to_excel(writer, sheet_name='Publication Types', index=False)
            
            # Top journals sheet
            if summary['top_journals']:
                pd.DataFrame(summary['top_journals']).to_excel(writer, sheet_name='Top Journals', index=False)
            
            # Top conferences sheet
            if summary['top_conferences']:
                pd.DataFrame(summary['top_conferences']).to_excel(writer, sheet_name='Top Conferences', index=False)
            
            # Author stats sheet
            if summary['author_stats']:
                pd.DataFrame(summary['author_stats']).to_excel(writer, sheet_name='Author Stats', index=False)
            
            # All publications sheet
            all_pubs = []
            for author in merged_data['authors']:
                for pub in author['publications']:
                    pub_copy = pub.copy()
                    pub_copy['author'] = author['name']
                    all_pubs.append(pub_copy)
            
            if all_pubs:
                # Select the most important columns for the Excel sheet
                pub_df = pd.DataFrame(all_pubs)
                selected_columns = ['author', 'title', 'year', 'venue', 'type', 'source']
                # Add optional columns if they exist
                optional_columns = ['doi', 'citations', 'authors']
                for col in optional_columns:
                    if col in pub_df.columns:
                        selected_columns.append(col)
                
                # Filter to only include columns that exist
                existing_columns = [col for col in selected_columns if col in pub_df.columns]
                pub_df[existing_columns].to_excel(writer, sheet_name='All Publications', index=False)
        
        logger.info(f"Excel report saved to {filename}")
        return filename
    except Exception as e:
        logger.error(f"Error creating Excel report: {e}")
        traceback.print_exc()
        return None

def main():
    """Main function to run the DBLP publication collection system"""
    try:
        # Parse arguments
        import argparse
        import sys
        import traceback
        from datetime import datetime
        import json
        import logging

        # Ensure logger is defined
        logger = logging.getLogger(__name__)
        
        parser = argparse.ArgumentParser(description='Collect publication data for LMCS researchers from DBLP')
        parser.add_argument('--year', type=int, default=datetime.now().year,
                            help='Target year (default: current year)')
        parser.add_argument('--output', type=str, default=None,
                            help='Output file path (default: dblp_lmcs_{year}.json)')
        parser.add_argument('--debug', action='store_true',
                            help='Run in debug mode with limited researchers')
        args = parser.parse_args()
        
        output_file = args.output if args.output else f"dblp_lmcs_{args.year}.json"
        
        logger.info(f"Starting DBLP publication collection for year {args.year}")
        logger.info(f"Output will be saved to: {output_file}")
        
        # Initialize WebDriver
        driver, wait = setup_webdriver()
        
        try:
            # Collect DBLP data
            logger.info("Starting DBLP data collection...")
            # Pass debug parameter if it's supported, otherwise just pass the standard parameters
            if args.debug:
                logger.info("Running in debug mode with limited researchers")
                
            dblp_data = collect_dblp_data(
                driver=driver,
                wait=wait,
                save_to_file=True,
                filename=output_file,
                target_year=args.year
            )
            logger.info(f"DBLP data collection completed. Found {len(dblp_data.get('authors', []))} researchers.")
            
            # Generate summary and export if data is available
            if dblp_data and dblp_data.get('authors'):
                logger.info("Generating publication summary...")
                summary = generate_publication_summary(dblp_data, args.year)
                
                # Save summary
                summary_file = f"publication_summary_2_{args.year}.json"
                with open(summary_file, "w", encoding="utf-8") as f:
                    json.dump(summary, f, ensure_ascii=False, indent=2)
                logger.info(f"Summary saved to {summary_file}")
                
                # Export to Excel
                logger.info("Exporting to Excel...")
                excel_file = export_to_excel(dblp_data, summary, args.year)
                if excel_file:
                    logger.info(f"Data successfully exported to {excel_file}")
            else:
                logger.warning("No DBLP data collected, skipping summary generation")
                
        finally:
            # Ensure WebDriver is properly closed
            if driver:
                driver.quit()
                logger.info("WebDriver closed")
    
    except Exception as e:
        logger.error(f"Fatal error: {str(e)}")
        traceback.print_exc()
        sys.exit(1)
    
    logger.info("Script completed successfully")

if __name__ == "__main__":
    main()