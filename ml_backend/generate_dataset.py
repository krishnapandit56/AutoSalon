"""
generate_dataset.py  –  Salon Customer Churn Dataset
Generates 8000 rows with strong, realistic feature→churn correlations.
Output: ../realistic_customer_dataset_8000.csv
"""
import numpy as np
import pandas as pd

np.random.seed(42)

N = 8000

cities      = ['Pune','Mumbai','Nagpur','Nashik','Aurangabad','Kolhapur',
               'Solapur','Amravati','Akola','Latur']
genders     = ['Male','Female']
mem_types   = ['None','Silver','Gold','Platinum']
mem_weights = [0.28, 0.35, 0.27, 0.10]
booking_src = ['Walk_In','Online_App','WhatsApp','Phone_Call',
               'Referral','Social_Media','AI_Calling']
time_pref   = ['Morning','Afternoon','Evening','Weekend','No_Preference']
services    = ['Haircut','Facial','Waxing','Massage','Pedicure','Manicure',
               'Threading','Blowout','Cleanup','Detan','Hair_Color','Keratin']

rows = []
for i in range(N):
    gender   = np.random.choice(genders, p=[0.22, 0.78])
    age      = int(np.clip(np.random.normal(32, 10), 18, 62))
    city     = np.random.choice(cities)
    src      = np.random.choice(booking_src)
    mem_type = np.random.choice(mem_types, p=mem_weights)
    mem_dur  = None if mem_type == 'None' else int(np.random.randint(1, 13))
    loyalty  = 0 if mem_type == 'None' else 1

    total_visits     = max(1, int(np.random.exponential(8)))
    avg_visit_gap    = max(7,  int(np.clip(np.random.normal(35, 18), 7, 120)))
    num_services     = int(np.random.randint(1, 6))
    has_pref_emp     = int(np.random.random() > 0.42)
    emp_changes      = max(0, int(np.random.poisson(1.1)))

    avg_spend        = round(max(150, np.random.normal(700, 380)), 2)
    last_spend       = round(avg_spend * np.random.uniform(0.6, 1.5), 2)
    total_spend      = round(avg_spend * total_visits, 2)

    avg_rating       = round(float(np.clip(np.random.normal(3.5, 0.9), 1.0, 5.0)), 1)
    num_complaints   = max(0, int(np.random.poisson(0.5)))
    feedback_given   = int(np.random.random() > 0.48)

    offers_redeemed  = max(0, int(np.random.poisson(1.5)))
    referrals        = max(0, int(np.random.poisson(0.6)))
    products         = max(0, int(np.random.poisson(1)))
    product_spend    = round(np.random.uniform(50, 800) if products > 0 else 0, 2)

    sms_sent         = max(0, int(np.random.poisson(6)))
    sms_resp         = max(0, min(sms_sent, int(np.random.poisson(2.5))))
    sms_rate         = round(sms_resp / sms_sent, 2) if sms_sent > 0 else 0.0

    appt_cancelled   = max(0, int(np.random.poisson(1.0)))
    appt_noshow      = max(0, int(np.random.poisson(0.5)))
    adv_booking_days = max(0, int(np.random.normal(4, 3)))
    time_p           = np.random.choice(time_pref)
    pref_svc         = np.random.choice(services)
    days_since_last  = max(0, int(np.random.normal(120, 90)))

    # ── Deterministic churn score (0-100) ──────────────────────────
    score = 50  # neutral baseline

    # Loyalty / membership → retain
    mem_bonus = {'None': +12, 'Silver': +3, 'Gold': -8, 'Platinum': -18}
    score += mem_bonus[mem_type]

    # Visit frequency → stay
    if total_visits >= 15:     score -= 20
    elif total_visits >= 8:    score -= 10
    elif total_visits <= 2:    score += 18

    # Rating → major signal
    if avg_rating <= 2.0:      score += 28
    elif avg_rating <= 3.0:    score += 14
    elif avg_rating >= 4.5:    score -= 20
    elif avg_rating >= 4.0:    score -= 10

    # Complaints → churn
    score += num_complaints * 10

    # Cancellations & no-shows
    score += appt_cancelled * 7
    score += appt_noshow    * 9

    # SMS engagement → retain
    if sms_rate >= 0.6:        score -= 12
    elif sms_rate >= 0.3:      score -= 5
    elif sms_rate == 0.0:      score += 7

    # Visit gap → churn
    if avg_visit_gap >= 80:    score += 18
    elif avg_visit_gap >= 50:  score += 9
    elif avg_visit_gap <= 20:  score -= 12

    # Offers & referrals → retain
    score -= min(offers_redeemed, 5) * 4
    score -= min(referrals, 3)       * 8

    # Employee changes → churn
    score += min(emp_changes, 5) * 4

    # Preferred employee → retain
    if has_pref_emp:           score -= 6

    # Clip score to 0-100
    score = float(np.clip(score, 0, 100))

    # Risk category based on deterministic score
    if score < 35:    risk_cat = 'Low'
    elif score < 48:  risk_cat = 'Low-Medium'
    elif score < 62:  risk_cat = 'Medium'
    else:             risk_cat = 'High'

    # ── Deterministic label + 5% label noise ──────────────────────
    # Churn if score >= 50 (above neutral), else no churn
    churn = 1 if score >= 50 else 0
    # Flip 5% of labels to add realism / avoid perfect 100%
    if np.random.random() < 0.05:
        churn = 1 - churn

    rows.append({
        'customer_id': f'CUST{i+1:05d}',
        'gender': gender, 'age': age, 'city': city,
        'booking_source': src,
        'membership_type': mem_type,
        'membership_duration_months': mem_dur,
        'loyalty_member': loyalty,
        'total_visits': total_visits,
        'days_since_last_visit': days_since_last,
        'avg_visit_gap_days': avg_visit_gap,
        'preferred_service': pref_svc,
        'num_services_used': num_services,
        'has_preferred_employee': has_pref_emp,
        'employee_change_count': emp_changes,
        'avg_spend_per_visit': avg_spend,
        'last_visit_spend': last_spend,
        'total_spend': total_spend,
        'products_purchased': products,
        'product_spend': product_spend,
        'feedback_given': feedback_given,
        'avg_rating': avg_rating,
        'num_complaints': num_complaints,
        'offers_redeemed': offers_redeemed,
        'appointments_cancelled': appt_cancelled,
        'appointments_no_show': appt_noshow,
        'avg_advance_booking_days': adv_booking_days,
        'sms_sent': sms_sent,
        'sms_responses': sms_resp,
        'sms_response_rate': sms_rate,
        'referrals_made': referrals,
        'visit_time_preference': time_p,
        'churn_risk_category': risk_cat,
        'churn': churn,
    })

df = pd.DataFrame(rows)
out = '../realistic_customer_dataset_8000.csv'
df.to_csv(out, index=False)

rate = df['churn'].mean()
print(f"Dataset saved → {len(df)} rows | churn rate = {rate:.1%}")
print(df['churn_risk_category'].value_counts())
