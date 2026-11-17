"""
CyberShield Python ML Anomaly Detection Microservice
Serves the Isolation Forest prediction API and metadata.
"""
import os
import json
import time
import datetime
import numpy as np
import pandas as pd
import joblib
from flask import Flask, request, jsonify

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, 'models')
METADATA_FILE = os.path.join(BASE_DIR, 'ml', 'model_metadata.json')
MODEL_FILE = os.path.join(MODELS_DIR, 'isolation_forest.joblib')
SCALER_FILE = os.path.join(MODELS_DIR, 'scaler.joblib')

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

model = None
scaler = None
metadata = {}
service_start_time = time.time()
prediction_history = []

def load_artifacts():
    global model, scaler, metadata
    try:
        if os.path.exists(MODEL_FILE) and os.path.exists(SCALER_FILE):
            model = joblib.load(MODEL_FILE)
            scaler = joblib.load(SCALER_FILE)
            print(f"[+] Loaded Isolation Forest model and Scaler from {MODELS_DIR}")
        else:
            print("[-] Model files not found. Auto-training now...")
            from train import train_model
            train_model()
            model = joblib.load(MODEL_FILE)
            scaler = joblib.load(SCALER_FILE)

        if os.path.exists(METADATA_FILE):
            with open(METADATA_FILE, 'r') as f:
                metadata = json.load(f)
    except Exception as e:
        print(f"[!] Error loading ML artifacts: {e}")

@app.route('/status', methods=['GET'])
def get_status():
    global metadata, service_start_time, prediction_history
    return jsonify({
        'status': 'ONLINE' if model is not None else 'ERROR',
        'service_uptime_seconds': int(time.time() - service_start_time),
        'predictions_count': len(prediction_history),
        'recent_predictions': prediction_history[-10:],
        'metadata': metadata
    })

@app.route('/predict', methods=['POST'])
def predict():
    global model, scaler, prediction_history
    if model is None or scaler is None:
        return jsonify({'error': 'Model is not loaded'}), 503

    payload = request.get_json(force=True, silent=True)
    if not payload:
        return jsonify({'error': 'Invalid JSON body'}), 400

    items = payload if isinstance(payload, list) else [payload]
    results = []

    for item in items:
        # Extract features or use defaults
        features = []
        for col in FEATURE_COLUMNS:
            val = item.get(col, item.get(col.replace('_', '')))
            if val is None:
                # Fallback heuristics for common network fields
                if col == 'destination_port': val = item.get('destinationPort', 80)
                elif col == 'flow_duration': val = item.get('flowDuration', 1000)
                elif col == 'total_fwd_packets': val = item.get('fwdPackets', 5)
                elif col == 'total_bwd_packets': val = item.get('bwdPackets', 4)
                elif col == 'flow_bytes_per_sec': val = item.get('bytesPerSec', 1500)
                elif col == 'flow_packets_per_sec': val = item.get('packetsPerSec', 30)
                elif col == 'packet_length_mean': val = item.get('packetLengthMean', 500)
                elif col == 'packet_length_std': val = item.get('packetLengthStd', 100)
                elif col == 'syn_flag_count': val = item.get('synFlag', 0)
                elif col == 'ack_flag_count': val = item.get('ackFlag', 1)
                else: val = 0.0
            try:
                features.append(float(val))
            except:
                features.append(0.0)

        # Scale and predict
        feat_arr = np.array([features])
        scaled_feat = scaler.transform(feat_arr)

        raw_decision = float(model.decision_function(scaled_feat)[0])
        # isolation forest raw_decision: higher = normal, lower (especially negative) = anomaly
        is_pred_anomaly = int(model.predict(scaled_feat)[0]) == -1

        # Normalize score into [0, 1] range where 1.0 is extremely anomalous
        # decision_function usually ranges from -0.3 to +0.3
        anomaly_score = float(np.clip(0.5 - (raw_decision * 1.6), 0.0, 1.0))

        if anomaly_score > 0.65 or is_pred_anomaly:
            classification = 'Anomalous'
        elif anomaly_score > 0.45:
            classification = 'Suspicious'
        else:
            classification = 'Normal'

        result = {
            'eventId': item.get('eventId', f"ML-{int(time.time()*1000)}"),
            'anomaly_score': round(anomaly_score, 4),
            'raw_decision': round(raw_decision, 4),
            'classification': classification,
            'is_anomaly': classification != 'Normal',
            'confidence': round(abs(anomaly_score - 0.5) * 2, 3),
            'timestamp': datetime.datetime.now(datetime.timezone.utc).isoformat()
        }
        results.append(result)
        prediction_history.append(result)
        if len(prediction_history) > 1000:
            prediction_history.pop(0)

    if isinstance(payload, list):
        return jsonify({'count': len(results), 'predictions': results})
    return jsonify(results[0])

@app.route('/retrain', methods=['POST'])
def retrain():
    try:
        from train import train_model
        new_metadata = train_model()
        load_artifacts()
        return jsonify({
            'success': True,
            'message': 'Isolation Forest model retrained and updated successfully',
            'metadata': new_metadata
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    load_artifacts()
    port = int(os.environ.get('PORT', 5001))
    print(f"[*] CyberShield Python ML Service listening on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=False)
