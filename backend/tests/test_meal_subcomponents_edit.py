import sys
import os
import json
from datetime import date
from dotenv import load_dotenv

load_dotenv(os.path.abspath(os.path.join(os.path.dirname(__file__), '../.env')))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db.database import SessionLocal, engine, Base
from app.db.models import MealLog
from app.schemas.schemas import MealLogUpdate
from app.api.logs import update_meal

def test_meal_subcomponent_editing():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # 1. Create a test meal with multiple subcomponents
        test_items = [
            {"name": "Item A (Rotis)", "portion": "2 pcs", "quantity": 2, "unit": "piece", "calories": 160.0, "protein_g": 6.0, "carbs_g": 30.0, "fat_g": 1.5, "fiber_g": 4.0},
            {"name": "Item B (Dal)", "portion": "1 bowl", "quantity": 1, "unit": "bowl", "calories": 140.0, "protein_g": 9.0, "carbs_g": 20.0, "fat_g": 3.0, "fiber_g": 5.0},
            {"name": "Item C (Paneer)", "portion": "100g", "quantity": 1, "unit": "serving", "calories": 200.0, "protein_g": 18.0, "carbs_g": 4.0, "fat_g": 14.0, "fiber_g": 0.0}
        ]

        total_cals = sum(i["calories"] for i in test_items) # 500.0
        total_prot = sum(i["protein_g"] for i in test_items) # 33.0
        total_carbs = sum(i["carbs_g"] for i in test_items) # 54.0
        total_fat = sum(i["fat_g"] for i in test_items) # 18.5
        total_fiber = sum(i["fiber_g"] for i in test_items) # 9.0

        meal = MealLog(
            meal_type="lunch",
            meal_title="Custom 3-Item Lunch",
            raw_transcript="Testing subcomponents",
            items_json=json.dumps(test_items),
            calories=total_cals,
            protein_g=total_prot,
            carbs_g=total_carbs,
            fat_g=total_fat,
            fiber_g=total_fiber,
            log_date=date.today()
        )
        db.add(meal)
        db.commit()
        db.refresh(meal)
        meal_id = meal.id
        print(f"✅ Created test meal id={meal_id} with 3 subcomponents. Total Cals={meal.calories} kcal, Protein={meal.protein_g}g")

        # 2. Simulate editing Item C (Paneer): increase to 150g -> 300 kcal, 27g Prot, 6g Carbs, 21g Fat
        updated_items = [
            test_items[0],
            test_items[1],
            {"name": "Item C (Paneer)", "portion": "150g", "quantity": 1.5, "unit": "serving", "calories": 300.0, "protein_g": 27.0, "carbs_g": 6.0, "fat_g": 21.0, "fiber_g": 0.0},
            {"name": "Item D (Curd)", "portion": "1 cup", "quantity": 1, "unit": "cup", "calories": 100.0, "protein_g": 4.0, "carbs_g": 6.0, "fat_g": 4.0, "fiber_g": 0.0}
        ]

        new_total_cals = sum(i["calories"] for i in updated_items) # 160 + 140 + 300 + 100 = 700.0
        new_total_prot = sum(i["protein_g"] for i in updated_items) # 6 + 9 + 27 + 4 = 46.0
        new_total_carbs = sum(i["carbs_g"] for i in updated_items) # 30 + 20 + 6 + 6 = 62.0
        new_total_fat = sum(i["fat_g"] for i in updated_items) # 1.5 + 3.0 + 21.0 + 4.0 = 29.5
        new_total_fiber = sum(i["fiber_g"] for i in updated_items) # 4 + 5 + 0 + 0 = 9.0

        update_payload = MealLogUpdate(
            meal_title="Custom 4-Item Lunch (Updated)",
            meal_type="lunch",
            items=updated_items,
            calories=new_total_cals,
            protein_g=new_total_prot,
            carbs_g=new_total_carbs,
            fat_g=new_total_fat,
            fiber_g=new_total_fiber,
            log_date=date.today()
        )

        resp = update_meal(meal_id=meal_id, payload=update_payload, db=db)
        
        assert resp.calories == 700.0, f"Expected 700.0 cals, got {resp.calories}"
        assert resp.protein_g == 46.0, f"Expected 46.0 protein, got {resp.protein_g}"
        assert resp.carbs_g == 62.0, f"Expected 62.0 carbs, got {resp.carbs_g}"
        assert resp.fat_g == 29.5, f"Expected 29.5 fat, got {resp.fat_g}"
        assert resp.fiber_g == 9.0, f"Expected 9.0 fiber, got {resp.fiber_g}"
        assert len(resp.items) == 4, f"Expected 4 items, got {len(resp.items)}"

        print(f"✅ Successfully updated meal id={meal_id}:")
        print(f"   • Calories: {resp.calories} kcal")
        print(f"   • Protein:  {resp.protein_g} g")
        print(f"   • Carbs:    {resp.carbs_g} g")
        print(f"   • Fat:      {resp.fat_g} g")
        print(f"   • Fiber:    {resp.fiber_g} g")
        print(f"   • Items Count: {len(resp.items)}")

        # Clean up test record
        db.delete(db.query(MealLog).filter(MealLog.id == meal_id).first())
        db.commit()
        print("✅ Cleaned up test record.")
        print("\n🎉 ALL SUBCOMPONENT EDITING & RE-SUMMING TESTS PASSED!")

    finally:
        db.close()

if __name__ == "__main__":
    test_meal_subcomponent_editing()
