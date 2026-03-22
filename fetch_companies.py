import requests
import json

url = "https://ziqnzsvnuagndqpeiyqm.supabase.co/rest/v1/companies?select=name&order=name"
headers = {
    "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppcW56c3ZudWFnbmRxcGVpeXFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5OTAwMTcsImV4cCI6MjA4OTU2NjAxN30.ZQKUzl4XIpASXg3X-kOeqN-jgdHqrN_XQf0tdc45Tbs",
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppcW56c3ZudWFnbmRxcGVpeXFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5OTAwMTcsImV4cCI6MjA4OTU2NjAxN30.ZQKUzl4XIpASXg3X-kOeqN-jgdHqrN_XQf0tdc45Tbs"
}

try:
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    data = response.json()
    names = [c['name'] for c in data]
    print(json.dumps(names, indent=2))
except Exception as e:
    print(f"Error: {e}")
