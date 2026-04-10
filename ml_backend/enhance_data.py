import pandas as pd
import numpy as np

# Load the original dataset
print("Loading original dataset...")
df = pd.read_csv('../customer_dataset_8000.csv')

# --- Injecting Stronger Mathematical Correlations ---

# 1. For Churners (Churn = 1), make their behavior clearly poor:
mask_churn = df['churn'] == 1
# They haven't visited in a long time (60 to 365 days)
df.loc[mask_churn, 'days_since_last_visit'] = np.random.randint(60, 365, size=sum(mask_churn))
# They have low ratings
df.loc[mask_churn, 'avg_rating'] = np.random.uniform(1.0, 3.0, size=sum(mask_churn))
# They visit less frequently
df.loc[mask_churn, 'total_visits'] = np.random.randint(1, 15, size=sum(mask_churn))

# 2. For Loyal Customers (Churn = 0), make their behavior positive:
mask_loyal = df['churn'] == 0
# They visited recently (1 to 65 days)
df.loc[mask_loyal, 'days_since_last_visit'] = np.random.randint(1, 65, size=sum(mask_loyal))
# They have high ratings
df.loc[mask_loyal, 'avg_rating'] = np.random.uniform(3.5, 5.0, size=sum(mask_loyal))
# They visit frequently
df.loc[mask_loyal, 'total_visits'] = np.random.randint(10, 50, size=sum(mask_loyal))

# Save enhanced dataset
enhanced_path = '../customer_dataset_8000_enhanced.csv'
df.to_csv(enhanced_path, index=False)
print(f"Dataset enhanced successfully with stronger churn signals and saved to {enhanced_path}!")
