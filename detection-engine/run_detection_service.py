"""
CyberShield ML Detection Service Runner
Starts the Flask ML Anomaly Detection service on port 5001.
"""
import os
import sys

# Add ml folder to sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
ml_dir = os.path.join(current_dir, 'ml')
sys.path.insert(0, ml_dir)

from predictor_service import app, load_artifacts

if __name__ == '__main__':
    load_artifacts()
    port = int(os.environ.get('PORT', 5001))
    print(f"[*] Starting CyberShield Python ML Anomaly Detection Service on http://127.0.0.1:{port}")
    app.run(host='0.0.0.0', port=port, debug=False)
