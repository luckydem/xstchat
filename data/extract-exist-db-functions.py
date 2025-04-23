import requests
from bs4 import BeautifulSoup
import json
import os

# Function to scrape URLs from <a> elements within a table
def scrape_table_links(url):
    try:
        # Send a GET request to the URL
        response = requests.get(url)
        response.raise_for_status()  # Raise an error for bad responses

        # Parse the HTML content
        soup = BeautifulSoup(response.text, 'html.parser')

        # Find the table (you can specify a class or id if needed)
        table = soup.find('table')  # Adjust this if you need a specific table

        if table:
            # Find all <a> elements within the table
            links = table.find_all('a')

            # Extract URLs from the href attribute
            urls = [link.get('href') for link in links if link.get('href') is not None]

            return urls
        else:
            print("No table found on the page.")
            return []

    except requests.exceptions.RequestException as e:
        print(f"An error occurred: {e}")
        return []

# Example usage

def save_to_json(data, filename):
    with open(filename, 'w') as json_file:
        json.dump(data, json_file, indent=4)

def get_module_xml_url(page_url):
    try:
        response = requests.get(page_url)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        module_div = soup.find('div', class_='module')
        
        if module_div and 'data-xqdoc' in module_div.attrs:
            xml_path = module_div['data-xqdoc']
            # Convert /db/... path to full URL
            return xml_path.replace('/db', 'https://exist-db.org/exist')
        return None
    except requests.exceptions.RequestException as e:
        print(f"Error fetching module page: {e}")
        return None

def download_xml(url, folder="modules"):
    if not os.path.exists(folder):
        os.makedirs(folder)
        
    try:
        response = requests.get(url)
        response.raise_for_status()
        
        # Extract filename from URL
        filename = url.split('/')[-1]
        filepath = os.path.join(folder, filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(response.text)
        print(f"Downloaded: {filename}")
    except requests.exceptions.RequestException as e:
        print(f"Error downloading XML: {e}")

if __name__ == "__main__":
    base_url = "http://localhost:8080/exist/apps/fundocs/"
    url_to_scrape = base_url + 'browse.html'

    urls = scrape_table_links(url_to_scrape)
    cleaned_urls = [base_url + url for url in urls]
    
    # Create a list to store both page URLs and their XML URLs
    all_urls = []
    
    # Process each page and get XML URLs
    for page_url in cleaned_urls:
        xml_url = get_module_xml_url(page_url)
        if xml_url:
            all_urls.append({
                'page_url': page_url,
                'xml_url': xml_url
            })
            download_xml(xml_url)
    
    file_name = 'exist-db-links.json'
    save_to_json(all_urls, file_name)
    
    print(f"Saved URLs to {file_name}")
    print(f"Downloaded XML files to 'modules' folder")