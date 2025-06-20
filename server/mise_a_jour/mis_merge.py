import json
import re
from pathlib import Path

# Import the functions from the other modules
try:
    from c import get_chercheur_lmcs_names  # Optional import, will be gracefully handled if missing
except ImportError:
    print("Warning: Could not import get_chercheur_lmcs_names from c. Some functionality may be limited.")
    get_chercheur_lmcs_names = lambda: []

try:
    from mis_scholar_2 import collect_research_data
except ImportError:
    print("Error: Could not import collect_research_data from mis_scholar_2.")
    def collect_research_data(save_to_file=True):
        print("Function collect_research_data is not available. Please check the mis_scholar_2.py file.")
        return []

try:
    from mis_dblp import collect_dblp_data
except ImportError:
    print("Error: Could not import collect_dblp_data from mis_dblp.")
    def collect_dblp_data(save_to_file=True):
        print("Function collect_dblp_data is not available. Please check the mis_dblp.py file.")
        return []

output_path = Path("final_merged_authors_with_venue.json")

def clean_name(name):
    return re.sub(r'\s+', ' ', name.strip().replace("\t", "").replace("\n", "")).lower()

def normalize_name(name):
    name = clean_name(name)
    name_parts = name.split()
    if len(name_parts) < 2:
        return {name}
    
    variations = set()
    for i in range(1, len(name_parts)):
        first = ' '.join(name_parts[:i])
        last = ' '.join(name_parts[i:])
        variations.add(f"{first} {last}".lower())
        variations.add(f"{last} {first}".lower())
    
    return variations or {name.lower()}

def normalize_title(title):
    if not title or not isinstance(title, str):
        return ""
    return re.sub(r'[^a-z0-9]', '', title.lower())

def merge_venue_details(pub1_venue, pub2_venue):
    """Merge venue details from both sources while preserving structure"""
    merged = {
        "scimago": {},
        "dgrsdt": {}
    }
    
    # Process publications_2 data
    if isinstance(pub2_venue, dict):
        merged["scimago"] = pub2_venue.get("scimago", {}) or {}
        merged["dgrsdt"] = pub2_venue.get("dgrsdt", {}) or {}
    
    # Process research_team data
    if isinstance(pub1_venue, dict):
        if "scimago" not in merged:
            merged["scimago"] = {}
        merged["scimago"].update(pub1_venue)
    elif isinstance(pub1_venue, str):
        merged["scimago"]["name"] = pub1_venue
    
    # Clean empty values
    return {k: v for k, v in merged.items() if v}

def print_publication_counts(data, label):
    print(f"\nPublication counts in {label}:")
    total_count = 0
    for author in data:
        if isinstance(author, dict) and "name" in author:
            name = author["name"]
            pub_count = len(author.get("publications", []))
            total_count += pub_count
            print(f"{name}: {pub_count} publications")
    print(f"Total: {total_count} publications")

def ensure_author_list(data):
    if isinstance(data, dict):
        return data.get("authors", [])
    return data if isinstance(data, list) else []

def merge_data(data1, data2):
    """
    Merge data from two sources.
    
    Args:
        data1: Research team data from Google Scholar
        data2: DBLP data
        
    Returns:
        list: Merged list of authors with their publications
    """
    if not data1 and not data2:
        print("Warning: Both data sources are empty.")
        return []
        
    data1 = ensure_author_list(data1) if data1 else []
    data2 = ensure_author_list(data2) if data2 else []

    merged_authors = {}
    name_variants = {}

    title_lookup = {}
    for author in data2:
        if not isinstance(author, dict):
            continue
        for pub in author.get("publications", []):
            if not isinstance(pub, dict):
                continue
            norm_title = normalize_title(pub.get("title", ""))
            if norm_title:
                title_lookup[norm_title] = pub

    def merge_publication_data(pub1, pub2):
        merged = {}
        all_keys = set(pub1.keys()) | set(pub2.keys())
        for key in all_keys:
            val1 = pub1.get(key) if isinstance(pub1, dict) else None
            val2 = pub2.get(key) if isinstance(pub2, dict) else None
            merged[key] = val2 if val2 not in [None, "", []] else val1
        merged["venue_details"] = merge_venue_details(
            pub1.get("venue_details", {}) if isinstance(pub1, dict) else {},
            pub2.get("venue_details", {}) if isinstance(pub2, dict) else {}
        )
        return merged

    def process_author(author, source):
        if not isinstance(author, dict) or "name" not in author:
            return
        name = author["name"]
        variations = normalize_name(name)

        matched_key = None
        for var in variations:
            if var in name_variants:
                matched_key = name_variants[var]
                break

        if not matched_key:
            matched_key = f"author_{len(merged_authors)}"
            merged_authors[matched_key] = {
                "name": name,
                "orcid_id": author.get("orcid_id"),
                "affiliation": author.get("affiliation"),
                "publications": [],
                "sources": set()
            }
            for var in variations:
                name_variants[var] = matched_key

        merged_author = merged_authors[matched_key]
        merged_author["sources"].add(source)

        existing_titles = {normalize_title(p.get("title", "")) for p in merged_author["publications"]}

        for pub in author.get("publications", []):
            if not isinstance(pub, dict):
                continue
            title = pub.get("title", "")
            title_norm = normalize_title(title)
            if not title or title_norm in existing_titles:
                continue

            if source == "research_team" and title_norm in title_lookup:
                pub2 = title_lookup[title_norm]
                full_pub = merge_publication_data(pub, pub2)
            else:
                full_pub = pub.copy()

            merged_author["publications"].append(full_pub)
            existing_titles.add(title_norm)

    for author in data1:
        process_author(author, "research_team")
    for author in data2:
        process_author(author, "publications")

    final_output = []
    for author in merged_authors.values():
        final_author = {
            "name": author["name"],
            "orcid_id": author.get("orcid_id"),
            "affiliation": author.get("affiliation"),
            "publications": [],
            "sources": list(author["sources"])
        }

        seen_titles = set()
        for pub in author["publications"]:
            title_norm = normalize_title(pub.get("title", ""))
            if title_norm and title_norm not in seen_titles:
                seen_titles.add(title_norm)
                final_author["publications"].append(pub)

        final_output.append(final_author)

    print_publication_counts(data1, "Research Team File")
    print_publication_counts(data2, "Publications File")
    print_publication_counts(final_output, "Merged File")

    return final_output

def merge_json_files(file1, file2, save_to_file=True, output_file=None):
    """Legacy function that reads from files"""
    try:
        with open(file1, "r", encoding="utf-8") as f1:
            raw_data1 = json.load(f1)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        print(f"Error reading file {file1}: {e}")
        raw_data1 = []

    try:
        with open(file2, "r", encoding="utf-8") as f2:
            raw_data2 = json.load(f2)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        print(f"Error reading file {file2}: {e}")
        raw_data2 = []

    final_output = merge_data(raw_data1, raw_data2)
    
    if save_to_file:
        output = Path(output_file) if output_file else output_path
        try:
            with open(output, "w", encoding="utf-8") as outfile:
                json.dump(final_output, outfile, indent=2, ensure_ascii=False)
            print(f"\nMerged data saved to: {output}")
        except Exception as e:
            print(f"Error saving to file {output}: {e}")
        
    return final_output

def collect_and_merge_data(save_to_file=True, output_file=None):
    """
    Collect data from both sources and merge them.
    
    Args:
        save_to_file (bool): Whether to save the results to a JSON file.
        output_file (str, optional): Custom output filename.
        
    Returns:
        list: Merged list of authors with their publications.
    """
    try:
        print("\nCollecting DBLP data...")
        dblp_data = collect_dblp_data(save_to_file=False)
    except Exception as e:
        print(f"Error collecting DBLP data: {e}")
        dblp_data = []
    
    try:
        print("\nCollecting Google Scholar data...")
        scholar_data = collect_research_data(save_to_file=False)
    except Exception as e:
        print(f"Error collecting Google Scholar data: {e}")
        scholar_data = []
    
    print("\nMerging data from both sources...")
    merged_data = merge_data(scholar_data, dblp_data)
    
    if save_to_file:
        output = Path(output_file) if output_file else output_path
        try:
            with open(output, "w", encoding="utf-8") as outfile:
                json.dump(merged_data, outfile, indent=2, ensure_ascii=False)
            print(f"\nMerged data saved to: {output}")
        except Exception as e:
            print(f"Error saving merged data: {e}")
    
    return merged_data

if __name__ == "__main__":
    # Use the new function to collect and merge data in one step
    try:
        merged_data = collect_and_merge_data()
        print(f"\nProcess completed successfully.")
    except Exception as e:
        print(f"Error during data collection and merging: {e}")