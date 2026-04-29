import sys
sys.path.append('backend')
from backend.supabase_client import get_supabase_client

try:
    client = get_supabase_client()
    record = {
        "name": "Test Record",
        "city": "Test City",
        "country": "India",
        "cuisines": "Test Cuisine",
        "avg_cost_for_two": 1000,
        "price_range": 2,
        "online_ordering": True,
        "table_booking": False,
        "delivering_now": False,
        "min_rating": 4.0,
        "price_label": "Affordable",
        "votes": 100,
        "predicted_rating": 4.5,
        "popularity_percent": 85.0,
        "success_label": "HIGH SUCCESS"
    }
    response = client.table("predictions").insert(record).execute()
    print("Success:", response)
except Exception as e:
    print("Error:", repr(e))
