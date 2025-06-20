from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from bs4 import BeautifulSoup
import time
import json
import sys

# -------------------------------------------
# 🟢 Step 1: Provide first and last name
# Example usage: python esi_author_email.py Nour Boudia
# -------------------------------------------
if len(sys.argv) < 3:
    print("Usage: python esi_author_email.py [firstname] [lastname]")
    sys.exit(1)

target_firstname = sys.argv[1].strip().lower()
target_lastname = sys.argv[2].strip().lower()

# -------------------------------------------
# 🟢 Step 2: Launch Selenium and fetch the page
# -------------------------------------------
chrome_options = Options()
chrome_options.add_argument("--headless")
service = Service("./chromedriver.exe")  # Update path if needed
driver = webdriver.Chrome(service=service, options=chrome_options)

url = "https://www.esi.dz/annuaire-des-enseignants/"
driver.get(url)
time.sleep(3)

page_source = driver.page_source
driver.quit()

# -------------------------------------------
# 🟢 Step 3: Parse HTML with BeautifulSoup
# -------------------------------------------
soup = BeautifulSoup(page_source, "html.parser")
table = soup.find("table")

extracted_authors = []
rows = table.find_all("tr")[1:]  # Skip header

for row in rows:
    cols = row.find_all("td")
    cols = [col.text.strip() for col in cols]
    if len(cols) >= 4:
        extracted_authors.append({
            "lastname": cols[0],
            "firstname": cols[1],
            "email": cols[2],
            "grade": cols[3]
        })

# -------------------------------------------
# 🟢 Step 4: Match by lastname or email
# -------------------------------------------
matched = None
for author in extracted_authors:
    lastname = author["lastname"].strip().lower()
    firstname = author["firstname"].strip().lower()
    email = author["email"].strip().lower()

    if lastname == target_lastname and firstname == target_firstname:
        matched = author
        break
    elif target_lastname in email:  # fallback
        matched = author
        break

# -------------------------------------------
# 🟢 Step 5: Save result to JSON
# -------------------------------------------
if matched:
    filename = f"author_email_{target_firstname}_{target_lastname}.json"
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(matched, f, ensure_ascii=False, indent=4)
    print(f"✅ Author matched: {matched}")
    print(f"📁 Data saved to {filename}")
else:
    print("❌ Author not found in ESI directory.")
