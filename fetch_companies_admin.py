import requests
import json

url = "https://ziqnzsvnuagndqpeiyqm.supabase.co/rest/v1/companies?select=name&order=name"
headers = {
    "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppcW56c3ZudWFnbmRxcGVpeXFtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzk5MDAxNywiZXhwIjoyMDg5NTY2MDE3fQ.oDzgr37epIQcsEAX3QOIojqxC6uyRkuReMv3cJanIGw",
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppcW56c3ZudWFnbmRxcGVpeXFtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzk5MDAxNywiZXhwIjoyMDg5NTY2MDE3fQ.oDzgr37epIQcsEAX3QOIojqxC6uyRkuReMv3cJanIGw"
}

try:
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    data = response.json()
    names = [c['name'] for c in data]
    print(json.dumps(names, indent=2))
except Exception as e:
    print(f"Error: {e}")
