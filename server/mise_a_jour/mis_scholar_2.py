import logging
import os
import sys
import traceback
import time
import json
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from scholarly import scholarly, MaxTriesExceededException
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
import io

# Set up logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                    handlers=[
                        logging.FileHandler("scholar_publications.log", encoding='utf-8'),
                        logging.StreamHandler()
                    ])
logger = logging.getLogger("ScholarPublicationCollector")

# Prevent Unicode errors by forcing terminal encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

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
            'volume': bib.get('volume')
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

def collect_google_scholar_publications(author_names, target_year=None, save_to_file=True):
    """
    Collect publication data for a list of authors from Google Scholar.
    
    Args:
        author_names (list): List of (id, name) tuples for authors
        target_year (int, optional): Filter publications to this specific year
        save_to_file (bool): Whether to save results to a JSON file
        
    Returns:
        list: List of author profiles with their publications
    """
    try:
        research_team = []
        current_year = datetime.now().year if target_year is None else target_year
        logger.info(f"Collecting Google Scholar publications for {len(author_names)} authors, year {current_year}...")
        
        for author_id, full_name in author_names:
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
                research_team.append(profile)
                logger.info(f" Captured {len(profile['publications'])} publications in {time.time()-start_time:.1f}s")
            else:
                logger.warning(f" No Google Scholar profile or publications found for {full_name}")

            # Add delay to avoid rate limiting
            logger.info("Waiting 5s before next researcher...")
            time.sleep(5)

        if save_to_file:
            # Save to current directory
            output_file = f"scholar_publications_{current_year}.json"
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(research_team, f, ensure_ascii=False, indent=2)
                
            logger.info(f"\n Final dataset contains {sum(len(a['publications']) for a in research_team)} publications across {len(research_team)} authors.")
            logger.info(f" Data saved to {output_file}")

        return research_team
    except Exception as e:
        logger.error(f"Fatal error in collect_google_scholar_publications: {str(e)}")
        traceback.print_exc()
        return []

def main():
    """Main function to run the Google Scholar publication collector"""
    try:
        # Parse command line arguments
        import argparse
        parser = argparse.ArgumentParser(description='Collect publication data from Google Scholar')
        parser.add_argument('--year', type=int, default=datetime.now().year,
                           help='Target year for publications (default: current year)')
        parser.add_argument('--authors', type=str, nargs='+',
                           help='List of author names (optional)')
        args = parser.parse_args()
        
        # Use provided authors or test data
        if args.authors:
            author_names = [(i, name) for i, name in enumerate(args.authors, 1)]
        else:
            # Example test data - replace with your own author list
            author_names = [
                (1, "John Smith"),
                (2, "Jane Doe"),
                (3, "Michael Johnson")
            ]
            logger.info("No authors specified, using test data")
        
        # Collect publications
        collect_google_scholar_publications(
            author_names=author_names,
            target_year=args.year,
            save_to_file=True
        )
        
        logger.info("Script completed successfully")
        
    except Exception as e:
        logger.error(f"Fatal error: {str(e)}")
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()