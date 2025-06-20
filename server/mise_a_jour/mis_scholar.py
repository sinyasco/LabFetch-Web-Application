import json
import time
import os
import sys
import traceback
from scholarly import scholarly, MaxTriesExceededException
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime

# Fix encoding issues at the start
import codecs
import locale

# Print debug information
print(f"Python version: {sys.version}")
print(f"Current directory: {os.getcwd()}")
print(f"System encoding: {sys.getdefaultencoding()}")
print(f"Locale encoding: {locale.getpreferredencoding()}")

# Force UTF-8 encoding for stdout/stderr if needed
if sys.stdout.encoding != 'utf-8':
    print(f"Changing stdout encoding from {sys.stdout.encoding} to utf-8")
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer)
if sys.stderr.encoding != 'utf-8':
    print(f"Changing stderr encoding from {sys.stderr.encoding} to utf-8")
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer)

try:
    from c import get_chercheur_lmcs_names
    print("Successfully imported get_chercheur_lmcs_names function")
except ImportError as e:
    print(f"Error importing module: {e}")
    # Fallback function for testing
    def get_chercheur_lmcs_names():
        print("Using test data for author names")
        return [
            (1, "John Smith"),
            (2, "Jane Doe"),
            (3, "Michael Johnson")
        ]

def extract_publication_info(pub, target_year=None):
    try:
        scholarly.fill(pub)
        bib = pub.get('bib', {})
        
        # Extract the year first to allow early validation
        pub_year = bib.get('year') or bib.get('pub_year')
        
        # If a target year is provided, check if this publication matches the target year
        if target_year is not None:
            if not pub_year or str(pub_year) != str(target_year):
                print(f"   Skipping publication from year {pub_year} (target: {target_year})")
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
            'Éditeur': bib.get('publisher', 'Unknown publisher'),
            'Établissement': etablissement,
            'Description': abstract,
            'Numéro': bib.get('number', None),
            'volume': bib.get('volume')
        }
        
        print(f"   Added publication: {publication_info['title'][:50]}... ({pub_year})")
        return publication_info
    except Exception as e:
        print(f"   Error processing publication: {str(e)}")
        return None

def get_author_profile(name, lastname, target_year=None):
    try:
        print(f"\n Searching for author: {name}...")
        search_query = scholarly.search_author(name)
        author = next(search_query, None)
        
        if not author:
            print(f" No exact profile found for {name}. Checking alternative matches...")
            
            for alt_author in search_query:
                alt_name = alt_author.get('name', '').lower()
                if lastname.lower() in alt_name:
                    print(f" Found a match based on last name: {alt_author['name']}")
                    author = alt_author
                    break
            
            if not author:
                print(f" No profile found for {name} or related names")
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
        
        print(f" Processing publications for {name} (target year: {target_year})...")
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
        print(f" Found {len(publications)} publications for {name} in year {target_year}")
        
        return profile
    except MaxTriesExceededException:
        print(f" Max tries exceeded for {name}, retrying after delay...")
        time.sleep(30)
        return get_author_profile(name, lastname, target_year)
    except Exception as e:
        print(f" Error processing {name}: {str(e)}")
        traceback.print_exc()
        return None

def collect_research_data(year=None, save_to_file=True):
    """
    Collect research data for all researchers in the team.
    
    Args:
        year (int, optional): Filter publications to this specific year. 
                             If None, all publications will be included.
        save_to_file (bool): Whether to save the results to a JSON file.
    
    Returns:
        list: List of researcher profiles with their publications.
    """
    try:
        research_team = []
        current_year = datetime.now().year if year is None else year
        print(f"Getting list of researchers for year {current_year}...")
        
        try:
            chercheurs = get_chercheur_lmcs_names()
            print(f"Found {len(chercheurs)} researchers")
        except Exception as e:
            print(f"Error getting researcher names: {str(e)}")
            traceback.print_exc()
            # Use test data as fallback
            chercheurs = [
                (1, "John Smith"),
                (2, "Jane Doe"),
                (3, "Michael Johnson")
            ]
            print(f"Using {len(chercheurs)} test researchers instead")

        # Process only a few researchers if debugging
        debug_mode = False
        if debug_mode:
            chercheurs = chercheurs[:2]  # Process only first 2 researchers
            print("DEBUG MODE: Processing only first 2 researchers")

        for chercheur_id, full_name in chercheurs:
            parts = full_name.strip().split()
            if not parts:
                print(f"Skipping researcher with invalid name: '{full_name}'")
                continue
                
            firstname = parts[0]
            lastname = parts[-1]

            print(f"\n Processing {full_name}...")
            start_time = time.time()
            profile = get_author_profile(full_name, lastname, target_year=current_year)

            if profile:
                research_team.append(profile)
                print(f" Captured {len(profile['publications'])} publications in {time.time()-start_time:.1f}s")
            else:
                print(f" No Google Scholar profile found for {full_name}")

            # Shorter delay in debug mode
            delay = 2 if debug_mode else 5
            print(f"Waiting {delay}s before next researcher...")
            time.sleep(delay)

        if save_to_file:
            # Save to current directory and to specified directory
            output_file = f"research_team_{current_year}.json"
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(research_team, f, ensure_ascii=False, indent=2)
                
            print(f"\n Final dataset contains {sum(len(a['publications']) for a in research_team)} publications across {len(research_team)} authors.")
            print(f" Data saved to {output_file}")

            # Write a simple status file to indicate completion
            with open(f"status_{current_year}.txt", 'w', encoding='utf-8') as f:
                f.write(f"Complete: {len(research_team)} researchers, {sum(len(a['publications']) for a in research_team)} publications")

        return research_team
    except Exception as e:
        print(f"Fatal error in collect_research_data: {str(e)}")
        traceback.print_exc()
        
        # Write error to a file that can be checked
        with open("error_log.txt", 'w', encoding='utf-8') as f:
            f.write(f"Error: {str(e)}\n\n")
            f.write(traceback.format_exc())
            
        return []

def main():
    try:
        # Print start message
        print("Starting scholarly data collection script...")
        
        # Default to current year
        current_year = datetime.now().year
        
        # Get year from command line if provided
        if len(sys.argv) > 1:
            try:
                current_year = int(sys.argv[1])
                print(f"Using year from command line: {current_year}")
            except ValueError:
                print(f"Invalid year argument: {sys.argv[1]}, using current year {current_year}")
        
        print(f"Collecting research data for year: {current_year}")
        collect_research_data(year=current_year, save_to_file=True)
        print("Script completed successfully")
    except Exception as e:
        print(f"Unhandled exception in main: {str(e)}")
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()