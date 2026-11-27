"""
Facebook Driver Scraper - Semi-Automated Tool
Helps automate the search for Tunisian drivers in Facebook groups

REQUIREMENTS:
    pip install selenium webdriver-manager openpyxl pandas

USAGE:
    1. Update FACEBOOK_EMAIL and FACEBOOK_PASSWORD
    2. Update SEARCH_KEYWORDS list with your preferred terms
    3. Run: python facebook_driver_scraper.py

NOTE: This is a template. Facebook's anti-scraping measures require:
    - Manual login (or Facebook API access)
    - Rate limiting (don't scrape too fast)
    - Manual verification of results
"""

import time
import re
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import openpyxl
from datetime import datetime
import pandas as pd

# ======================
# CONFIGURATION
# ======================

# Facebook Groups to Search (Add more as you discover them)
FACEBOOK_GROUPS = [
    {
        "name": "Germany-Tunisia Transport",
        "id": "599707792915392",
        "url": "https://www.facebook.com/groups/599707792915392/"
    },
    {
        "name": "Tunisia Germany Shipping",
        "id": "878263024033423",
        "url": "https://www.facebook.com/groups/878263024033423/"
    }
]

# Search Keywords (High Priority)
SEARCH_KEYWORDS = [
    # German
    "Transport Tunesien Deutschland",
    "LKW Fahrer Tunesien",
    "Spedition Tunesien",
    "Fracht nach Tunesien",

    # French
    "Transport Tunisie Allemagne",
    "Transporteur tunisien",
    "Chauffeur routier Tunisie",

    # English
    "Tunisia Germany transport",
    "Tunisian truck driver",
]

# Phone number patterns
PHONE_PATTERNS = [
    r'\+49\s?1[567]\d{1}\s?\d{7,8}',  # German mobile
    r'\+216\s?[2-9]\d{1}\s?\d{6}',     # Tunisian mobile
    r'49\s?1[567]\d{1}\s?\d{7,8}',     # German without +
    r'216\s?[2-9]\d{1}\s?\d{6}',       # Tunisian without +
]

DATABASE_FILE = "Enhanced_Driver_Database_v2.xlsx"

# ======================
# HELPER FUNCTIONS
# ======================

def extract_phone_numbers(text):
    """Extract phone numbers from text"""
    phones = []
    for pattern in PHONE_PATTERNS:
        found = re.findall(pattern, text)
        phones.extend(found)

    # Clean and format
    cleaned = []
    for phone in phones:
        # Remove spaces
        phone = phone.replace(" ", "")
        # Add + if missing
        if not phone.startswith("+"):
            if phone.startswith("49"):
                phone = "+" + phone
            elif phone.startswith("216"):
                phone = "+" + phone
        cleaned.append(phone)

    return list(set(cleaned))  # Remove duplicates

def is_transport_related(text):
    """Check if text contains transport-related keywords"""
    keywords = [
        "transport", "spedition", "logistik", "lkw", "fahrer",
        "fracht", "umzug", "lieferung", "driver", "freight",
        "trucking", "logistics", "chauffeur", "transporteur",
        "tunisia", "tunisie", "tunesien", "تونس"
    ]
    text_lower = text.lower()
    return any(keyword in text_lower for keyword in keywords)

def get_next_driver_id(wb):
    """Get next available driver ID"""
    ws = wb["Drivers Database"]
    last_row = ws.max_row

    if last_row == 1:  # Only header
        return "D001"

    last_id = ws[f"A{last_row}"].value
    if last_id and last_id.startswith("D"):
        num = int(last_id[1:]) + 1
        return f"D{num:03d}"
    return "D001"

def add_driver_to_database(driver_data):
    """Add a new driver to the Excel database"""
    try:
        wb = openpyxl.load_workbook(DATABASE_FILE)
        ws = wb["Drivers Database"]

        # Check for duplicates
        for row in range(2, ws.max_row + 1):
            existing_name = ws[f"B{row}"].value
            existing_phone = ws[f"H{row}"].value

            if (existing_name and existing_name == driver_data.get("name")) or \
               (existing_phone and existing_phone == driver_data.get("phone")):
                print(f"  ⚠️  Duplicate found: {driver_data.get('name', 'Unknown')} - Skipping")
                return False

        # Add new row
        new_row = ws.max_row + 1
        driver_id = get_next_driver_id(wb)

        ws[f"A{new_row}"] = driver_id
        ws[f"B{new_row}"] = driver_data.get("name", "")
        ws[f"C{new_row}"] = driver_data.get("business_name", "")
        ws[f"D{new_row}"] = driver_data.get("driver_type", "Individual")
        ws[f"E{new_row}"] = driver_data.get("city", "Unknown")
        ws[f"F{new_row}"] = driver_data.get("country", "Germany")
        ws[f"G{new_row}"] = driver_data.get("delivers_to", "Tunisia")
        ws[f"H{new_row}"] = driver_data.get("phone", "")
        ws[f"I{new_row}"] = driver_data.get("whatsapp", "")
        ws[f"J{new_row}"] = driver_data.get("facebook_profile", "")
        ws[f"K{new_row}"] = driver_data.get("facebook_id", "")
        ws[f"N{new_row}"] = "Pending"  # Verified
        ws[f"O{new_row}"] = "Medium"   # Data Quality
        ws[f"P{new_row}"] = driver_data.get("source", "Facebook Scraper")
        ws[f"Q{new_row}"] = driver_data.get("keywords", "")
        ws[f"R{new_row}"] = datetime.now().strftime("%Y-%m-%d")
        ws[f"V{new_row}"] = "Pending"  # Active Status

        wb.save(DATABASE_FILE)
        print(f"  ✓ Added: {driver_id} - {driver_data.get('name', 'Unknown')}")
        return True

    except Exception as e:
        print(f"  ✗ Error adding to database: {e}")
        return False

# ======================
# SCRAPER CLASS
# ======================

class FacebookDriverScraper:
    def __init__(self):
        print("Initializing Facebook Driver Scraper...")

        # Setup Chrome options
        options = webdriver.ChromeOptions()
        options.add_argument("--start-maximized")
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option('useAutomationExtension', False)

        # Initialize driver
        self.driver = webdriver.Chrome(
            service=Service(ChromeDriverManager().install()),
            options=options
        )
        self.wait = WebDriverWait(self.driver, 10)

        print("✓ Browser initialized")

    def login_manual(self):
        """Manual login to Facebook"""
        print("\n=== MANUAL LOGIN REQUIRED ===")
        print("1. Browser will open Facebook")
        print("2. Log in manually")
        print("3. Press ENTER here when logged in")

        self.driver.get("https://www.facebook.com")
        input("\nPress ENTER after you've logged in manually...")
        print("✓ Login confirmed")

    def search_group(self, group, keyword):
        """Search for a keyword within a Facebook group"""
        print(f"\n  Searching '{keyword}' in {group['name']}...")

        # Navigate to group
        search_url = f"{group['url']}search/?q={keyword.replace(' ', '+')}"
        self.driver.get(search_url)
        time.sleep(3)  # Wait for page load

        # Scroll to load more results
        for _ in range(3):
            self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(2)

        results = []

        # Extract posts (this is simplified - Facebook's structure changes frequently)
        try:
            posts = self.driver.find_elements(By.CSS_SELECTOR, "div[role='article']")
            print(f"  Found {len(posts)} posts")

            for i, post in enumerate(posts[:10]):  # Limit to first 10
                try:
                    # Extract text content
                    text = post.text

                    # Check if transport-related
                    if not is_transport_related(text):
                        continue

                    # Extract phone numbers
                    phones = extract_phone_numbers(text)

                    # Try to extract profile link (simplified)
                    profile_links = post.find_elements(By.CSS_SELECTOR, "a[href*='/profile']")
                    profile_url = profile_links[0].get_attribute("href") if profile_links else ""

                    # Extract name from profile link or text
                    name = ""
                    if profile_links:
                        name = profile_links[0].text

                    if phones or name:
                        result = {
                            "name": name,
                            "phone": phones[0] if phones else "",
                            "whatsapp": phones[0] if phones else "",
                            "facebook_profile": profile_url,
                            "source": f"Facebook Group: {group['name']}",
                            "keywords": keyword,
                            "text_snippet": text[:200]
                        }
                        results.append(result)
                        print(f"    ✓ Found potential driver: {name or 'Unknown'}")

                except Exception as e:
                    print(f"    ⚠️  Error processing post {i}: {e}")
                    continue

        except Exception as e:
            print(f"  ✗ Error searching group: {e}")

        return results

    def scrape_all(self):
        """Main scraping function"""
        print("\n" + "="*60)
        print("STARTING FACEBOOK DRIVER SCRAPER")
        print("="*60)

        # Check if database exists
        try:
            wb = openpyxl.load_workbook(DATABASE_FILE)
            print(f"✓ Database loaded: {DATABASE_FILE}")
        except FileNotFoundError:
            print(f"✗ Database not found: {DATABASE_FILE}")
            print("  Please ensure Enhanced_Driver_Database_v2.xlsx is in the same folder")
            return

        # Manual login
        self.login_manual()

        total_found = 0
        total_added = 0

        # Search each group with each keyword
        for group in FACEBOOK_GROUPS:
            print(f"\n{'='*60}")
            print(f"GROUP: {group['name']}")
            print(f"{'='*60}")

            for keyword in SEARCH_KEYWORDS:
                results = self.search_group(group, keyword)

                for result in results:
                    total_found += 1
                    if add_driver_to_database(result):
                        total_added += 1

                # Rate limiting
                time.sleep(5)

        print(f"\n{'='*60}")
        print("SCRAPING COMPLETE")
        print(f"{'='*60}")
        print(f"Total potential drivers found: {total_found}")
        print(f"New drivers added to database: {total_added}")
        print(f"Duplicates skipped: {total_found - total_added}")

    def close(self):
        """Close the browser"""
        self.driver.quit()
        print("\n✓ Browser closed")

# ======================
# MAIN EXECUTION
# ======================

if __name__ == "__main__":
    scraper = FacebookDriverScraper()

    try:
        scraper.scrape_all()
    except KeyboardInterrupt:
        print("\n\n⚠️  Scraping interrupted by user")
    except Exception as e:
        print(f"\n✗ Error: {e}")
    finally:
        scraper.close()

    print("\n" + "="*60)
    print("Next steps:")
    print("1. Open Enhanced_Driver_Database_v2.xlsx")
    print("2. Review new entries (Status: 'Pending')")
    print("3. Verify contact information")
    print("4. Update 'Verified' and 'Data Quality' fields")
    print("="*60)
