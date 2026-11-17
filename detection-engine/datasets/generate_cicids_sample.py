"""
CIC-IDS2017 Sample Dataset Generator
Generates canonical network flow records adhering to the Canadian Institute for Cybersecurity (CIC) IDS2017 schema.
"""
import os
import numpy as np
import pandas as pd

def generate_cicids_sample(output_path, n_samples=1500):
    np.random.seed(42)
    
    # 70% Benign, 30% Attack flows
    n_benign = int(n_samples * 0.70)
    n_attack = n_samples - n_benign

    # 1. Benign Traffic Distribution
    benign_data = {
        'destination_port': np.random.choice([80, 443, 53, 8080, 22], size=n_benign, p=[0.4, 0.45, 0.1, 0.03, 0.02]),
        'flow_duration': np.random.exponential(scale=50000, size=n_benign), # microseconds
        'total_fwd_packets': np.random.poisson(lam=12, size=n_benign) + 1,
        'total_bwd_packets': np.random.poisson(lam=10, size=n_benign),
        'flow_bytes_per_sec': np.random.gamma(shape=2, scale=3000, size=n_benign),
        'flow_packets_per_sec': np.random.gamma(shape=2, scale=80, size=n_benign),
        'packet_length_mean': np.random.normal(loc=450, scale=80, size=n_benign).clip(40, 1500),
        'packet_length_std': np.random.normal(loc=120, scale=30, size=n_benign).clip(0, 500),
        'syn_flag_count': np.random.binomial(n=1, p=0.08, size=n_benign),
        'ack_flag_count': np.random.binomial(n=1, p=0.92, size=n_benign),
        'label': ['BENIGN'] * n_benign
    }

    # 2. Attack Traffic Distribution (PortScan, DoS, BruteForce)
    attack_types = ['PortScan', 'DoS', 'BruteForce']
    labels = np.random.choice(attack_types, size=n_attack, p=[0.4, 0.4, 0.2])
    
    # Attacks have abnormal characteristics:
    # PortScan: short duration, high unique port range, 1 fwd pkt, 0 bwd, high syn
    # DoS: extreme flow_packets_per_sec, small packet size or massive volume
    # BruteForce: repeated 22/80 ports, failed payloads
    
    flow_duration = []
    dest_ports = []
    fwd_pkts = []
    bwd_pkts = []
    bytes_sec = []
    pkts_sec = []
    pkt_mean = []
    pkt_std = []
    syn_count = []
    ack_count = []
    
    for l in labels:
        if l == 'PortScan':
            dest_ports.append(np.random.randint(1, 65535))
            flow_duration.append(np.random.exponential(scale=200)) # microsec
            fwd_pkts.append(1)
            bwd_pkts.append(0)
            bytes_sec.append(np.random.uniform(40, 200))
            pkts_sec.append(np.random.uniform(1000, 5000))
            pkt_mean.append(44.0)
            pkt_std.append(0.0)
            syn_count.append(1)
            ack_count.append(0)
        elif l == 'DoS':
            dest_ports.append(80)
            flow_duration.append(np.random.exponential(scale=800000))
            fwd_pkts.append(np.random.randint(200, 1500))
            bwd_pkts.append(np.random.randint(0, 5))
            bytes_sec.append(np.random.uniform(250000, 2000000))
            pkts_sec.append(np.random.uniform(5000, 35000))
            pkt_mean.append(np.random.uniform(800, 1400))
            pkt_std.append(np.random.uniform(300, 600))
            syn_count.append(1)
            ack_count.append(0)
        else: # BruteForce
            dest_ports.append(22)
            flow_duration.append(np.random.exponential(scale=15000))
            fwd_pkts.append(np.random.randint(15, 45))
            bwd_pkts.append(np.random.randint(10, 30))
            bytes_sec.append(np.random.uniform(1000, 8000))
            pkts_sec.append(np.random.uniform(200, 800))
            pkt_mean.append(np.random.uniform(90, 200))
            pkt_std.append(np.random.uniform(40, 90))
            syn_count.append(1)
            ack_count.append(1)

    attack_data = {
        'destination_port': dest_ports,
        'flow_duration': flow_duration,
        'total_fwd_packets': fwd_pkts,
        'total_bwd_packets': bwd_pkts,
        'flow_bytes_per_sec': bytes_sec,
        'flow_packets_per_sec': pkts_sec,
        'packet_length_mean': pkt_mean,
        'packet_length_std': pkt_std,
        'syn_flag_count': syn_count,
        'ack_flag_count': ack_count,
        'label': labels
    }

    df_benign = pd.DataFrame(benign_data)
    df_attack = pd.DataFrame(attack_data)
    df = pd.concat([df_benign, df_attack], ignore_index=True).sample(frac=1, random_state=42).reset_index(drop=True)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)
    print(f"Generated {len(df)} records in {output_path} (Benign: {n_benign}, Attack: {n_attack})")
    return df

if __name__ == '__main__':
    script_dir = os.path.dirname(os.path.abspath(__file__))
    out_file = os.path.join(script_dir, 'cicids_sample.csv')
    generate_cicids_sample(out_file)
