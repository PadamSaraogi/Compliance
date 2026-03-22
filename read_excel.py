import pandas as pd
import json
import sys

try:
    file_path = "claude.xlsx"
    df = pd.read_excel(file_path)
    
    # Clean the data: replace NaN with empty string
    df = df.fillna('')
    
    # Get columns and data
    result = {
        "columns": df.columns.tolist(),
        "rows": df.head(20).values.tolist() # first 20 rows for checking
    }
    
    print(json.dumps(result, indent=2))
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
