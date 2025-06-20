import requests
import xmltodict
from typing import Optional

def get_orcid_from_name(name: str) -> Optional[str]:
    """Fetch ORCID ID for a given name using ORCID public API.
    
    Args:
        name: Full name of researcher to search for
        
    Returns:
        ORCID ID as string if found, None otherwise
    """
    try:
        # Make API request
        url = f"https://pub.orcid.org/v3.0/search?q={name}"
        response = requests.get(url, headers={'Accept': 'application/xml'})
        response.raise_for_status()
        
        # Parse XML response
        data_dict = xmltodict.parse(response.content)
        
        # Navigate through XML structure
        results = data_dict.get('search:search', {}).get('search:result', [])
        
        if not results:
            print(f"No ORCID found for {name}")
            return None
            
        first_result = results[0]
        orcid_id = first_result.get('common:orcid-identifier', {}).get('common:path')
        print(orcid_id)
        
        if not orcid_id:
            print(f"ORCID format unexpected for {name}")
            return None
            
        return orcid_id
        
    except requests.exceptions.RequestException as e:
        print(f"HTTP error occurred: {str(e)}")
    except (xmltodict.expat.ExpatError, KeyError, IndexError) as e:
        print(f"XML parsing error: {str(e)}")
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        
    return None

