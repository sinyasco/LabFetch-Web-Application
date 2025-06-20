import requests
from bs4 import BeautifulSoup

def scrape_dgrsdt_revues_A(query):
    url = f"https://www.dgrsdt.dz/fr/revues_A?search={query}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
    }
    
    response = requests.get(url, headers=headers, verify=False)
    if response.status_code != 200:
        return None
    
    soup = BeautifulSoup(response.text, "lxml")
    row = soup.find("li", class_="table-row")
    
    if not row:
        return None

    return {
        "Category": "Revue A",
        "Journal Title": row.find("div", {"data-label": "Journal_Title"}).get_text(strip=True),
        "Publisher": row.find("div", {"data-label": "Publisher"}).get_text(strip=True),
        "ISSN": row.find("div", {"data-label": "ISSN"}).get_text(strip=True),
        "EISSN": row.find("div", {"data-label": "EISSN"}).get_text(strip=True)
    }

def scrape_dgrsdt_revues_B(type, journal):
    url = f"https://www.dgrsdt.dz/fr/revues_B?revue={type}&search={journal}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
    }
    
    response = requests.get(url, headers=headers, verify=False)
    if response.status_code != 200:
        return None
    
    soup = BeautifulSoup(response.text, "lxml")
    row = soup.find("li", class_="table-row")
    
    if not row:
        return None

    return {
        "Category": "Revue B",
        "Type": type,
        "Journal Title": row.find("div", {"data-label": "Journal_Title"}).get_text(strip=True),
        "Publisher": row.find("div", {"data-label": "Publisher"}).get_text(strip=True),
        "ISSN": row.find("div", {"data-label": "ISSN"}).get_text(strip=True),
        "EISSN": row.find("div", {"data-label": "EISSN"}).get_text(strip=True)
    }

def scrape_dgrsdt(query):
    Type_List = ["ABCD", "De_Gruyter", "Erih_plus", "Journal_quality", "AERES", "CNRS", "SCOPUS", "Finacial_Times"]
    
    result = scrape_dgrsdt_revues_A(query)
    if result:
        print(result)
        return result
    
    for index in Type_List:
        result = scrape_dgrsdt_revues_B(index, query)
        if result:
            print(result)
            return result
    
    return {"Category": "Not Found", "Message": "No results found"}
