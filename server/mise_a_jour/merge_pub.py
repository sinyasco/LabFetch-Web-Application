#!/usr/bin/env python3
"""
merge_pub.py - Script to fetch and merge publications from DBLP and Google Scholar
Usage: python merge_pub.py firstname lastname
"""

import json
import re
import sys
import os
import time
from pathlib import Path
import traceback

# Import functions from your existing scripts
try:
    from dblp_scraper_one_author import get_author_publication_data
    from save_scholar_data import get_author_profile
except ImportError:
    print("Warning: Could not import one or more required modules.")
    print("Make sure dblp_scraper_one_author.py and save_scholar_data.py are in the same directory.")

# ------------------------- Helper Functions -------------------------

def clean_name(name):
    """Clean a name by removing excess whitespace and normalizing case"""
    return re.sub(r'\s+', ' ', name.strip().replace("\t", "").replace("\n", "")).lower()

def normalize_name(name):
    """Generate variations of a name to improve matching"""
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
    return variations

def normalize_title(title):
    """Normalize a publication title for comparison"""
    return re.sub(r'[^a-z0-9]', '', title.lower())

def merge_venue_details(pub1_venue, pub2_venue):
    """Merge venue details from two publication sources"""
    merged = {
        "scimago": {},
        "dgrsdt": {}
    }
    if isinstance(pub2_venue, dict):
        merged["scimago"] = pub2_venue.get("scimago", {}) or {}
        merged["dgrsdt"] = pub2_venue.get("dgrsdt", {}) or {}
    if isinstance(pub1_venue, dict):
        merged["scimago"].update(pub1_venue)
    elif isinstance(pub1_venue, str):
        merged["scimago"]["name"] = pub1_venue
    return {k: v for k, v in merged.items() if v}

def ensure_author_list(data):
    """Ensure data is in the expected format with an authors list"""
    if isinstance(data, dict):
        return data.get("authors", [])
    return data if isinstance(data, list) else []

def find_author_by_name(data, name_variations):
    """Find an author in the data matching any of the name variations"""
    for author in data:
        author_name = clean_name(author.get("name", ""))
        if author_name in name_variations:
            return author
    return None

def merge_publication_data(pub1, pub2):
    """Merge data from two publications, preferring pub2 values where available"""
    merged = {}
    all_keys = set(pub1.keys()) | set(pub2.keys())
    for key in all_keys:
        val1 = pub1.get(key)
        val2 = pub2.get(key)
        merged[key] = val2 if val2 not in [None, "", []] else val1
    merged["venue_details"] = merge_venue_details(
        pub1.get("venue_details", {}),
        pub2.get("venue_details", {})
    )
    return merged

def merge_json_files(file1, file2, target_author_name):
    """Merge publication data from two JSON files"""
    try:
        with open(file1, "r", encoding="utf-8") as f1:
            try:
                raw_data1 = json.load(f1)
            except json.JSONDecodeError:
                print(f"❌ Error: {file1} contains invalid JSON")
                raw_data1 = []
        
        with open(file2, "r", encoding="utf-8") as f2:
            try:
                raw_data2 = json.load(f2)
            except json.JSONDecodeError:
                print(f"❌ Error: {file2} contains invalid JSON")
                raw_data2 = []

        data1 = ensure_author_list(raw_data1)
        data2 = ensure_author_list(raw_data2)

        target_variations = normalize_name(target_author_name)

        author1 = find_author_by_name(data1, target_variations)
        author2 = find_author_by_name(data2, target_variations)

        if not author1 and not author2:
            print(f"❌ Author '{target_author_name}' not found in either file.")
            return None

        merged_author = {
            "name": target_author_name,
            "orcid_id": author1.get("orcid_id") if author1 else author2.get("orcid_id") if author2 else None,
            "affiliation": author1.get("affiliation") if author1 else author2.get("affiliation") if author2 else None,
            "publications": [],
            "sources": []
        }

        # Get citation counts and h-index from scholar if available
        if author2:
            merged_author["citation_count"] = author2.get("citation_count", 0)
            merged_author["h_index"] = author2.get("h_index", 0)
            merged_author["i10_index"] = author2.get("i10_index", 0)

        existing_titles = set()

        title_lookup2 = {}
        if author2:
            for pub in author2.get("publications", []):
                norm_title = normalize_title(pub.get("title", ""))
                if norm_title:
                    title_lookup2[norm_title] = pub

        if author1:
            merged_author["sources"].append("dblp")
            for pub in author1.get("publications", []):
                title_norm = normalize_title(pub.get("title", ""))
                if not title_norm:
                    continue
                if title_norm in title_lookup2:
                    pub2 = title_lookup2[title_norm]
                    full_pub = merge_publication_data(pub, pub2)
                    merged_author["publications"].append(full_pub)
                else:
                    merged_author["publications"].append(pub)
                existing_titles.add(title_norm)

        if author2:
            merged_author["sources"].append("scholar")
            for pub in author2.get("publications", []):
                title_norm = normalize_title(pub.get("title", ""))
                if title_norm not in existing_titles:
                    merged_author["publications"].append(pub)
                    existing_titles.add(title_norm)

        # Add summary metrics
        pub_count = len(merged_author["publications"])
        merged_author["publication_count"] = pub_count
        
        return merged_author
    
    except Exception as e:
        print(f"❌ Error merging JSON files: {str(e)}")
        traceback.print_exc()
        return None

def main():
    """Main function to process arguments and fetch/merge publication data"""
    try:
        if len(sys.argv) < 3:
            print("Usage: python merge_pub.py [first_name] [last_name]")
            print(json.dumps({
                "error": "Missing arguments",
                "usage": "python merge_pub.py [first_name] [last_name]"
            }))
            return 1

        firstname = sys.argv[1]
        lastname = sys.argv[2]
        full_name = f"{firstname} {lastname}"

        print(f"Processing publications for: {full_name}")

        # Create temp directory if it doesn't exist
        temp_dir = Path("temp_data")
        temp_dir.mkdir(parents=True, exist_ok=True)

        # Output filenames
        dblp_output_filename = temp_dir / f"output_publications.json"
        scholar_output_filename = temp_dir / f"{firstname}_{lastname}_scholar.json"

        # Step 1: Fetch DBLP data
        print(f"Fetching DBLP data for {full_name}...")
        get_author_publication_data(firstname, lastname, dblp_output_filename)

        # Step 2: Fetch Google Scholar profile
        print(f"Fetching Google Scholar data for {full_name}...")
        profile_json = get_author_profile(full_name, lastname)

        # Save Scholar JSON
        if profile_json:
            with open(scholar_output_filename, "w", encoding="utf-8") as f:
                f.write(profile_json)
        else:
            print("⚠️ No Google Scholar data found")
            # Create empty file to avoid errors in the next step
            with open(scholar_output_filename, "w", encoding="utf-8") as f:
                f.write("[]")

        # Step 3: Merge JSON files
        print(f"Merging publication data for {full_name}...")
        merged_data = merge_json_files(dblp_output_filename, scholar_output_filename, full_name)

        if merged_data:
            # Create the final output JSON
            result = {
                "author": merged_data.get("name", full_name),
                "orcid_id": merged_data.get("orcid_id"),
                "affiliation": merged_data.get("affiliation"),
                "sources": merged_data.get("sources", []),
                "publication_count": merged_data.get("publication_count", 0),
                "citation_count": merged_data.get("citation_count", 0),
                "h_index": merged_data.get("h_index", 0),
                "i10_index": merged_data.get("i10_index", 0),
                "publications": merged_data.get("publications", [])
            }
            
            # Print result as JSON to stdout for the Node.js server to capture
            print(json.dumps(result, ensure_ascii=False))
            return 0
        else:
            error_result = {
                "author": full_name,
                "error": "No publication data found or error occurred during merging",
                "publication_count": 0,
                "publications": []
            }
            print(json.dumps(error_result))
            return 1

    except Exception as e:
        error_msg = f"❌ Error in main function: {str(e)}"
        print(error_msg)
        traceback.print_exc()
        print(json.dumps({
            "error": error_msg,
            "author": f"{firstname} {lastname}",
            "publication_count": 0,
            "publications": []
        }))
        
       # Wrap result into the desired format
    final_output = {
    "authors": [result]
    }

# Save to file
    with open(temp_dir / "output_publications.json", "w", encoding="utf-8") as out_file:
        json.dump(final_output, out_file, ensure_ascii=False, indent=2)
        return 1

if __name__ == "__main__":
    sys.exit(main())