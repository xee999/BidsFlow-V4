import requests
import json
import uuid
from datetime import datetime

# Configuration
STAGING_API_URL = "https://bidsflow-staging-661116307651.us-central1.run.app/api/bids"

def create_rfp_bid(customer_name, project_name):
    """
    Creates a new Bid object in the BidsFlow system with the correct schema.
    
    Status must be one of: ['Active', 'Submitted', 'Won', 'Lost', 'No Bid']
    Stages (currentStage) are: ['Intake', 'Qualification', 'Solutioning', 'Pricing', 'Compliance', 'Final Review']
    """
    
    # Core identifying details
    bid_id = f"bid-{uuid.uuid4()}"
    today = datetime.now().strftime("%Y-%m-%d")
    
    # Replicating the Frontend logic from BidIntake.tsx
    # We use 'Active' as the status and 'Intake' as the currentStage for new RFPs.
    payload = {
        "id": bid_id,
        "customerName": customer_name,
        "projectName": project_name,
        "receivedDate": today,
        "deadline": today,  # Default to today if unknown, update later
        "status": "Active", # REQUIRED ENUM: 'Active', 'Submitted', etc.
        "currentStage": "Intake", # NEW RFPs start here
        "riskLevel": "Low",
        "estimatedValue": 0,
        "currency": "PKR",
        "bidSecurity": "To be determined",
        "requiredSolutions": ["Cloud & IT"], # Example solution
        "summaryRequirements": "RFP Opportunity pushed from Second Brain agent.",
        "scopeOfWork": "Initial intake stage.",
        "jbcName": "Second Brain Agent",
        "channel": "Enterprise",
        "region": "North",
        "contractDuration": "1",
        "daysInStages": {"Intake": 1},
        "stageHistory": [
            {
                "stage": "Intake",
                "timestamp": datetime.now().isoformat() + "Z"
            }
        ]
    }

    print(f"--- Sending POST request to: {STAGING_API_URL} ---")
    print(f"Payload Preview:\n{json.dumps(payload, indent=2)}\n")

    try:
        response = requests.post(
            STAGING_API_URL, 
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 201:
            print("✅ Success! Bid created successfully.")
            return response.json()
        else:
            print(f"❌ Failed! Status Code: {response.status_code}")
            print(f"Error Response: {response.text}")
            return None
    except Exception as e:
        print(f"💥 Connection Error: {str(e)}")
        return None

if __name__ == "__main__":
    # Example usage
    customer = "Global Industries Ltd"
    project = "AI Infrastructure Modernization 2026"
    
    result = create_rfp_bid(customer, project)
    
    if result:
        print("\nCreated Bid ID:", result.get("id"))
