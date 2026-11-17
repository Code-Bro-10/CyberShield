"""
CyberShield Isolation Forest Anomaly Detection Training Pipeline
Trains an unsupervised anomaly detector on network flow features and computes real evaluation metrics.
"""
import os
import json
import datetime
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix

FEATURE_COLUMNS = [
    'destination_port',
    'flow_duration',
    'total_fwd_packets',
    'total_bwd_packets',
    'flow_bytes_per_sec',
    'flow_packets_per_sec',
    'packet_length_mean',
    'packet_length_std',
    'syn_flag_count',
    'ack_flag_count'
]

def train_model(data_path=None, models_dir=None, metadata_path=None):
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if data_path is None:
        data_path = os.path.join(base_dir, 'datasets', 'cicids_sample.csv')
    if models_dir is None:
        models_dir = os.path.join(base_dir, 'models')
    if metadata_path is None:
        metadata_path = os.path.join(base_dir, 'ml', 'model_metadata.json')

    os.makedirs(models_dir, exist_ok=True)
    os.makedirs(os.path.dirname(metadata_path), exist_ok=True)

    print(f"[*] Loading dataset from: {data_path}")
    df = pd.read_csv(data_path)

    # Clean & handle missing/infinite values
    for col in FEATURE_COLUMNS:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')
            df[col] = df[col].replace([np.inf, -np.inf], np.nan)
            df[col] = df[col].fillna(df[col].median())

    # Map labels: 1 = Normal/Benign, -1 = Attack/Anomaly
    y_ground_truth = np.where(df['label'] == 'BENIGN', 1, -1)
    X = df[FEATURE_COLUMNS].copy()

    # Train / Test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_ground_truth, test_size=0.30, random_state=42, stratify=y_ground_truth
    )

    print(f"[*] Preprocessing and scaling features ({len(FEATURE_COLUMNS)} dimensions)...")
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # Estimate contamination from ground truth training set
    actual_contamination = float(np.mean(y_train == -1))
    contamination = min(0.35, max(0.05, actual_contamination))
    print(f"[*] Training Isolation Forest (n_estimators=100, contamination={contamination:.3f})...")

    clf = IsolationForest(
        n_estimators=100,
        max_samples='auto',
        contamination=contamination,
        random_state=42,
        n_jobs=-1
    )
    clf.fit(X_train_scaled)

    print("[*] Evaluating model against holdout test split...")
    y_pred = clf.predict(X_test_scaled)
    # Decision function: lower values mean more anomalous (negative)
    raw_scores = clf.decision_function(X_test_scaled)

    # Compute actual classification metrics
    # Note: In binary classification, 1 is positive (Normal), -1 is negative (Anomaly).
    # For attack detection, let's treat -1 (anomaly) as the positive target for precision/recall:
    y_test_binary = np.where(y_test == -1, 1, 0)
    y_pred_binary = np.where(y_pred == -1, 1, 0)

    accuracy = float(accuracy_score(y_test_binary, y_pred_binary))
    precision = float(precision_score(y_test_binary, y_pred_binary, zero_division=0))
    recall = float(recall_score(y_test_binary, y_pred_binary, zero_division=0))
    f1 = float(f1_score(y_test_binary, y_pred_binary, zero_division=0))
    cm = confusion_matrix(y_test_binary, y_pred_binary).tolist()

    print("\n" + "="*50)
    print("ACTUAL EVALUATION RESULTS (Holdout Test Set):")
    print(f"  Total Test Samples: {len(y_test)}")
    print(f"  Accuracy:           {accuracy*100:.2f}%")
    print(f"  Precision:          {precision*100:.2f}%")
    print(f"  Recall:             {recall*100:.2f}%")
    print(f"  F1-Score:           {f1*100:.2f}%")
    print(f"  Confusion Matrix:   TN={cm[0][0]}, FP={cm[0][1]}, FN={cm[1][0]}, TP={cm[1][1]}")
    print("="*50 + "\n")

    # Save artifacts
    model_file = os.path.join(models_dir, 'isolation_forest.joblib')
    scaler_file = os.path.join(models_dir, 'scaler.joblib')
    joblib.dump(clf, model_file)
    joblib.dump(scaler, scaler_file)
    print(f"[+] Model saved to: {model_file}")
    print(f"[+] Scaler saved to: {scaler_file}")

    metadata = {
        'model_name': 'Isolation Forest Network Anomaly Detector',
        'algorithm': 'IsolationForest',
        'trained_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'dataset': 'CIC-IDS2017 Sample Flow Logs',
        'total_samples': len(df),
        'train_samples': len(X_train),
        'test_samples': len(X_test),
        'features': FEATURE_COLUMNS,
        'hyperparameters': {
            'n_estimators': 100,
            'contamination': contamination,
            'max_samples': 'auto',
            'random_state': 42
        },
        'evaluation': {
            'accuracy': round(accuracy, 4),
            'precision': round(precision, 4),
            'recall': round(recall, 4),
            'f1_score': round(f1, 4),
            'confusion_matrix': {
                'true_negative': cm[0][0],
                'false_positive': cm[0][1],
                'false_negative': cm[1][0],
                'true_positive': cm[1][1]
            }
        },
        'status': 'READY'
    }

    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"[+] Metadata saved to: {metadata_path}")

    return metadata

if __name__ == '__main__':
    train_model()
