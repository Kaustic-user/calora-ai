import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_weekly_trends_timeframes():
    for days in [7, 14, 30, 90]:
        resp = client.get(f"/api/logs/weekly-trends?days={days}")
        assert resp.status_code == 200, f"Failed for days={days}: {resp.text}"
        data = resp.json()
        assert len(data["daily_data"]) == days, f"Expected {days} daily points, got {len(data['daily_data'])}"
        assert data["timeframe_days"] == days
        assert "timeframe_label" in data
        assert f"{days} Days" in data["timeframe_label"]
        print(f"✅ Tested timeframe {days}D: {len(data['daily_data'])} points, label='{data['timeframe_label']}'")

    # Test Custom Range
    resp_custom = client.get("/api/logs/weekly-trends?start_date=2026-09-01&end_date=2026-09-18")
    assert resp_custom.status_code == 200
    data_custom = resp_custom.json()
    assert len(data_custom["daily_data"]) == 18
    assert data_custom["timeframe_days"] == 18
    assert "Sep 01" in data_custom["timeframe_label"] or "Sep 1" in data_custom["timeframe_label"]
    print(f"✅ Tested custom range (18 days): returned {len(data_custom['daily_data'])} points, label='{data_custom['timeframe_label']}'")

if __name__ == "__main__":
    test_weekly_trends_timeframes()
    print("🎉 All timeframe trend tests passed successfully!")
