import sys
import json
import time
import logging
<<<<<<< HEAD
import os
=======
>>>>>>> a5d78a35a35ee60ebf38939ee0c89c50f80041cc
from concurrent.futures import ThreadPoolExecutor, as_completed

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import scholarly with better error handling
try:
<<<<<<< HEAD
    from scholarly import scholarly, MaxTriesExceededException, ProxyGenerator
except ImportError:
    logger.error("scholarly module not found. Install with: pip install scholarly")
    sys.exit(1)

def setup_proxy():
    """Set up proxy for scholarly to avoid CAPTCHA issues"""
    pg = ProxyGenerator()
    success = pg.FreeProxies()
    if not success:
        # Try Tor if available
        success = pg.Tor_External(tor_sock_port=9050, tor_control_port=9051)
    
    if success:
        scholarly.use_proxy(pg)
        logger.info("Proxy configured successfully")
    else:
        logger.warning("Failed to configure proxy, CAPTCHA issues may occur")

def extract_publication_info(pub):
    """Extract and structure publication information"""
    try:
        # Add retries for filling publication
        max_retries = 3
        for attempt in range(max_retries):
            try:
                scholarly.fill(pub)
                break
            except MaxTriesExceededException:
                if attempt < max_retries - 1:
                    logger.warning(f"CAPTCHA or rate limit encountered, retrying in {(attempt+1)*10} seconds...")
                    time.sleep((attempt+1) * 10)
                else:
                    raise
        
=======
    from scholarly import scholarly, MaxTriesExceededException
except ImportError:
    logger.error("scholarly module not found. Install with: pip install scholarly")
    scholarly = None
    MaxTriesExceededException = Exception
def extract_publication_info(pub):
    try:
        scholarly.fill(pub)
>>>>>>> a5d78a35a35ee60ebf38939ee0c89c50f80041cc
        bib = pub.get('bib', {})
        year = bib.get('year') or bib.get('pub_year')
        abstract = bib.get('abstract') or bib.get('summary') or bib.get('description') or "No description available"
        venue = bib.get('conference') or bib.get('journal') or bib.get('venue') or "Unknown venue"
        etablissement = pub.get('institution') or pub.get('affiliation') or "Unknown établissement"

        return {
            'title': bib.get('title', 'Untitled'),
            'year': year,
            'venue': venue,
            'type': bib.get('type', 'Unknown type'),
            'pages': bib.get('pages'),
            'doi': bib.get('doi'),
            'url': pub.get('pub_url', pub.get('eprint_url', None)),
            'authors': bib.get('author', '').split(' and ') if isinstance(bib.get('author', ''), str) else [],
            'citations': pub.get('num_citations', 0),
            'Éditeur': bib.get('publisher', 'Unknown publisher'),
            'Établissement': etablissement,
            'Description': abstract,
            'Numéro': bib.get('number', None),
            'volume': bib.get('volume')
        }
<<<<<<< HEAD
    except Exception as e:
        logger.error(f"Error extracting publication info: {str(e)}")
        return {
            'title': pub.get('bib', {}).get('title', 'Untitled'),
            'error': str(e),
            'partial_data': True
        }


def get_author_profile(name, lastname, max_attempts=3):
    """Get author profile with improved error handling and retry logic"""
    attempts = 0
    while attempts < max_attempts:
        try:
            logger.info(f"Searching for author: {name} (Attempt {attempts+1}/{max_attempts})")
            search_query = scholarly.search_author(name)
            author = next(search_query, None)

            if not author:
                logger.info(f"No exact match found for {name}, searching for lastname: {lastname}")
                for _ in range(5):  # Check a few results
                    try:
                        alt_author = next(search_query)
                        if lastname.lower() in alt_author.get('name', '').lower():
                            author = alt_author
                            logger.info(f"Found alternative match: {alt_author.get('name')}")
                            break
                    except StopIteration:
                        break
                
                if not author:
                    logger.error(f"No author found for {name} {lastname}")
                    return create_error_response(f"No author profile found for {name} {lastname}")

            logger.info(f"Found author: {author.get('name')}, filling profile details...")
            
            # Retry scholarly.fill if CAPTCHA appears
            fill_attempts = 0
            while fill_attempts < 3:
                try:
                    scholarly.fill(author, sections=['basics', 'indices', 'counts', 'publications'])
                    break
                except MaxTriesExceededException:
                    fill_attempts += 1
                    wait_time = fill_attempts * 20
                    logger.warning(f"CAPTCHA encountered while filling profile, waiting {wait_time} seconds...")
                    time.sleep(wait_time)
                    if fill_attempts >= 3:
                        return create_error_response("CAPTCHA limit exceeded. Try again later or use a different network.")
            
            publications = author.get('publications', [])
            if not publications:
                logger.warning(f"No publications found for {author.get('name')}")
            
            profile = {
                'name': author.get('name', name),
                'affiliation': author.get('affiliation', 'Unknown Affiliation'),
                'profile_url': author.get('url', f"https://scholar.google.com/citations?user={author.get('scholar_id', '')}"),
                'interests': author.get('interests', []),
                'citation_stats': {
                    'total_citations': author.get('citedby', 0),
                    'h_index': author.get('hindex', 0),
                    'i10_index': author.get('i10index', 0)
                },
                'publications': [],
                'scrape_info': {
                    'date': time.strftime('%Y-%m-%d %H:%M:%S'),
                    'status': 'success'
                }
            }

            logger.info(f"Found {len(publications)} publications. Extracting details...")
            successful_pubs = 0
            
            # Process publications with a thread pool
            with ThreadPoolExecutor(max_workers=3) as executor:
                future_to_pub = {executor.submit(extract_publication_info, pub): pub for pub in publications[:20]}  # Limit to 20 publications
                for future in as_completed(future_to_pub):
                    pub_info = future.result()
                    if pub_info:
                        profile['publications'].append(pub_info)
                        successful_pubs += 1
            
            logger.info(f"Successfully extracted {successful_pubs} publications")
            
            # Create filename with sanitized name
            sanitized_name = "".join(c if c.isalnum() or c in [' ', '_'] else '_' for c in name)
            filename = f"{sanitized_name.replace(' ', '_')}_{lastname}.json"
            
            # Save JSON string to file
            profile_json = json.dumps(profile, ensure_ascii=False, indent=4)
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(profile_json)
                
            logger.info(f"Saved profile to {filename}")
            return profile_json

        except MaxTriesExceededException:
            attempts += 1
            wait_time = attempts * 30
            logger.warning(f"Google Scholar is blocking requests. Waiting {wait_time} seconds before retry...")
            time.sleep(wait_time)
        except Exception as e:
            logger.error(f"Error retrieving author profile: {str(e)}")
            return create_error_response(str(e))
    
    return create_error_response("Maximum retry attempts reached. Google Scholar may be blocking requests.")


def create_error_response(error_message):
    """Create standardized error JSON response"""
    error_data = {
        "error": True,
        "message": error_message,
        "timestamp": time.strftime('%Y-%m-%d %H:%M:%S')
    }
    
    error_json = json.dumps(error_data, ensure_ascii=False, indent=4)
    
    # Save error to file
    error_filename = f"error_{time.strftime('%Y%m%d_%H%M%S')}.json"
    with open(error_filename, 'w', encoding='utf-8') as f:
        f.write(error_json)
    
    logger.error(f"Saved error details to {error_filename}")
    return error_json


if __name__ == "__main__":
    # Show usage information if no arguments provided
    if len(sys.argv) < 3:
        print("Usage: python improved_scholar_data.py firstname lastname [use_proxy]")
        print("  - firstname: Author's first name")
        print("  - lastname: Author's last name")
        print("  - use_proxy: Optional. Set to 'proxy' to use proxy for avoiding CAPTCHA")
        sys.exit(1)
    
    # Parse arguments
    firstname = sys.argv[1]
    lastname = sys.argv[2]
    use_proxy = len(sys.argv) > 3 and sys.argv[3].lower() == 'proxy'
    
    full_name = f"{firstname} {lastname}"
    
    logger.info(f"Starting search for {full_name}")
    
    # Set up proxy if requested
    if use_proxy:
        setup_proxy()
    
    # Get author profile
    result = get_author_profile(full_name, lastname)
    
    # Output result
=======
    except Exception:
        return None


def get_author_profile(name, lastname):
    try:
        search_query = scholarly.search_author(name)
        author = next(search_query, None)

        if not author:
            for alt_author in search_query:
                if lastname.lower() in alt_author.get('name', '').lower():
                    author = alt_author
                    break
            if not author:
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

        with ThreadPoolExecutor(max_workers=5) as executor:
            pub_infos = list(executor.map(extract_publication_info, author.get('publications', [])))
            profile['publications'] = list(filter(None, pub_infos))

        # Convert to JSON string
        profile_json = json.dumps(profile, ensure_ascii=False, indent=4)

        # Save JSON string to file
        filename = f"{name.replace(' ', '_')}_{lastname}.json"
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(profile_json)

        # Return the JSON string
        return profile_json

    except MaxTriesExceededException:
        time.sleep(30)
        return get_author_profile(name, lastname)
    except Exception as e:
        return json.dumps({"error": str(e)}, ensure_ascii=False, indent=4)
    
if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python save_scholar_data.py firstname lastname")
        sys.exit(1)
        
    firstname = sys.argv[1]
    lastname = sys.argv[2]
    full_name = f"{firstname} {lastname}"
    
    result = get_author_profile(full_name, lastname)
>>>>>>> a5d78a35a35ee60ebf38939ee0c89c50f80041cc
    print(result)