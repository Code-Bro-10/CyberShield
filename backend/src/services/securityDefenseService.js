const SecurityDefense = require('../models/SecurityDefense');
const Alert = require('../models/Alert');
const ThreatIntelligence = require('../models/ThreatIntelligence');
const SystemLog = require('../models/SystemLog');
const { getSocketIO } = require('../sockets/socketHandler');
const logger = require('../utils/logger');

const generateFirewallRules = (target, defenseType, category) => {
  const isIP = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(target);
  const isHash = /^[a-fA-F0-9]{64}$/.test(target);

  if (defenseType === 'BLOCK_IP' || (isIP && defenseType !== 'RATE_LIMIT')) {
    return {
      iptables: `sudo iptables -I INPUT -s ${target} -j DROP && sudo iptables -I FORWARD -s ${target} -j DROP`,
      ufw: `sudo ufw insert 1 deny from ${target} to any`,
      powershell: `New-NetFirewallRule -DisplayName "CyberShield-Block-${target}" -Direction Inbound -Action Block -RemoteAddress "${target}"`,
      fail2ban: `fail2ban-client set sshd banip ${target}`,
    };
  }

  if (defenseType === 'RATE_LIMIT') {
    return {
      iptables: isIP
        ? `sudo iptables -I INPUT -p tcp -s ${target} -m connlimit --connlimit-above 10 -j REJECT`
        : `sudo iptables -I INPUT -p tcp -m state --state NEW -m limit --limit 50/minute --limit-burst 100 -j ACCEPT`,
      ufw: `sudo ufw limit proto tcp to any port 80,443`,
      powershell: `New-NetQosPolicy -Name "CyberShield-Throttle-${target}" -IPLocalPort 80,443 -ThrottleRateActionBitsPerSecond 1000000`,
      fail2ban: isIP ? `fail2ban-client set nginx-limit-req banip ${target}` : `systemctl restart fail2ban`,
    };
  }

  if (defenseType === 'QUARANTINE_HASH' || isHash) {
    return {
      iptables: `# Endpoint Hash Quarantine: ${target}\nsudo sed -i '/${target}/d' /etc/cybershield/allowed_hashes.conf`,
      ufw: `# Isolate traffic originating from binary hash ${target.substring(0, 16)}...`,
      powershell: `Set-MpPreference -ThreatIDDefaultAction_Ids 2147722748 -ThreatIDDefaultAction_Actions 3 # Quarantine SHA256: ${target}`,
      fail2ban: `# Hash quarantine broadcast to all registered Linux sensor agents`,
    };
  }

  if (defenseType === 'ENABLE_SYN_COOKIES') {
    return {
      iptables: `sudo sysctl -w net.ipv4.tcp_syncookies=1 && sudo sysctl -w net.ipv4.tcp_max_syn_backlog=4096`,
      ufw: `sudo sysctl -w net.ipv4.tcp_syncookies=1`,
      powershell: `Set-NetTCPSetting -SettingName InternetCustom -SynAttackProtect Enabled`,
      fail2ban: `sudo iptables -A INPUT -p tcp --syn -m limit --limit 1/s --limit-burst 3 -j ACCEPT`,
    };
  }

  if (defenseType === 'ISOLATE_HOST') {
    return {
      iptables: `sudo iptables -I INPUT ! -s 10.0.0.1 -j DROP && sudo iptables -I OUTPUT ! -d 10.0.0.1 -j DROP`,
      ufw: `sudo ufw default deny incoming && sudo ufw default deny outgoing`,
      powershell: `Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled True; New-NetFirewallRule -DisplayName "CyberShield-Host-Isolation" -Direction Outbound -Action Block`,
      fail2ban: `# Host fully isolated from network mesh`,
    };
  }

  if (defenseType === 'PROPAGATE_IOC') {
    return {
      iptables: `sudo ipset add cybershield-blacklist ${target} 2>/dev/null || sudo iptables -I INPUT -s ${target} -j DROP`,
      ufw: `sudo ufw insert 1 deny from ${target} to any`,
      powershell: `New-NetFirewallRule -DisplayName "CyberShield-IOC-${target}" -Direction Inbound -Action Block -RemoteAddress "${target}"`,
      fail2ban: `fail2ban-client set sshd banip ${target}`,
    };
  }

  return {
    iptables: `sudo iptables -I INPUT -s ${target} -j DROP`,
    ufw: `sudo ufw deny from ${target}`,
    powershell: `New-NetFirewallRule -DisplayName "CyberShield-Protect-${target}" -Direction Inbound -Action Block -RemoteAddress "${target}"`,
    fail2ban: `fail2ban-client set sshd banip ${target}`,
  };
};

const getPlaybooks = () => {
  return [
    {
      category: 'Brute Force',
      title: 'Authentication Brute Force Mitigation Playbook',
      severity: 'High',
      description: 'Repeated authentication failures detected from an external or internal source IP targeting local credentials.',
      mitigations: [
        {
          id: 'bf-block-ip',
          defenseType: 'BLOCK_IP',
          title: 'Perimeter IP Ban (24h)',
          description: 'Deploy immediate DROP firewall rule at host and perimeter firewalls for the offending source IP.',
          automated: true,
          badgeColor: 'red',
        },
        {
          id: 'bf-rate-limit',
          defenseType: 'RATE_LIMIT',
          title: 'Apply Strict Authentication Rate-Limiting',
          description: 'Throttle maximum login requests to 5 attempts per minute per source IP with exponential backoff.',
          automated: true,
          badgeColor: 'amber',
        },
        {
          id: 'bf-propagate',
          defenseType: 'PROPAGATE_IOC',
          title: 'Propagate IOC to All Mesh Nodes',
          description: 'Distribute the brute-force IP address to all registered monitoring nodes for proactive boundary filtering.',
          automated: true,
          badgeColor: 'blue',
        },
      ],
      recommendedCommand: 'iptables -I INPUT -s <IP> -j DROP',
    },
    {
      category: 'Port Scan',
      title: 'Reconnaissance & Port Scan Defense Playbook',
      severity: 'Medium',
      description: 'Sequential or distributed SYN/TCP probing detected across multiple distinct network ports.',
      mitigations: [
        {
          id: 'ps-block-ip',
          defenseType: 'BLOCK_IP',
          title: 'Instant Stealth Drop',
          description: 'Silently drop all incoming packets from the scanner to prevent OS fingerprinting and service mapping.',
          automated: true,
          badgeColor: 'red',
        },
        {
          id: 'ps-rate-limit',
          defenseType: 'RATE_LIMIT',
          title: 'Enable ICMP & SYN Rate-Limiting',
          description: 'Limit new TCP connection handshake bursts to prevent automated scanning tools from harvesting open ports.',
          automated: true,
          badgeColor: 'amber',
        },
        {
          id: 'ps-propagate',
          defenseType: 'PROPAGATE_IOC',
          title: 'Blacklist Scanner Across SOC Cluster',
          description: 'Share scanning IP with distributed threat database and trigger automated blackhole routing.',
          automated: true,
          badgeColor: 'blue',
        },
      ],
      recommendedCommand: 'sudo ufw insert 1 deny from <IP> to any',
    },
    {
      category: 'DDoS / Traffic Anomaly',
      title: 'Volumetric Flood & DDoS Defense Playbook',
      severity: 'Critical',
      description: 'High packet volume, SYN flood, or abnormal connection frequency detected threatening service availability.',
      mitigations: [
        {
          id: 'ddos-syncookies',
          defenseType: 'ENABLE_SYN_COOKIES',
          title: 'Activate Kernel SYN Cookies',
          description: 'Enable SYN Cookies in the Linux/Windows network stack to prevent TCP connection backlog exhaustion.',
          automated: true,
          badgeColor: 'emerald',
        },
        {
          id: 'ddos-rate-limit',
          defenseType: 'RATE_LIMIT',
          title: 'Clamp Connection Concurrency',
          description: 'Limit concurrent inbound connections per source IP to 25 and enforce token-bucket bandwidth throttling.',
          automated: true,
          badgeColor: 'amber',
        },
        {
          id: 'ddos-block-ip',
          defenseType: 'BLOCK_IP',
          title: 'Drop Flood Origin IP',
          description: 'Instruct boundary gateway and upstream routers to null-route or drop traffic from the primary flood source.',
          automated: true,
          badgeColor: 'red',
        },
      ],
      recommendedCommand: 'sysctl -w net.ipv4.tcp_syncookies=1',
    },
    {
      category: 'Suspicious IP',
      title: 'Threat Intelligence IOC Countermeasure Playbook',
      severity: 'High',
      description: 'Active communication observed with a known Command & Control (C2), Tor exit node, or malicious actor IP.',
      mitigations: [
        {
          id: 'ioc-block-ip',
          defenseType: 'BLOCK_IP',
          title: 'Border Gateway Null-Route / Drop',
          description: 'Instantly sever both ingress and egress communication with the verified malicious indicator IP.',
          automated: true,
          badgeColor: 'red',
        },
        {
          id: 'ioc-propagate',
          defenseType: 'PROPAGATE_IOC',
          title: 'Cluster-wide Threat Intel Sync',
          description: 'Elevate confidence score to 100% and sync indicator across all distributed sensors for zero-latency drops.',
          automated: true,
          badgeColor: 'blue',
        },
        {
          id: 'ioc-isolate',
          defenseType: 'ISOLATE_HOST',
          title: 'Quarantine Contacted Sensor Node',
          description: 'Temporarily isolate the local node that communicated with the C2 server to prevent lateral spread.',
          automated: true,
          badgeColor: 'purple',
        },
      ],
      recommendedCommand: 'sudo iptables -I INPUT -s <IP> -j DROP && sudo iptables -I FORWARD -s <IP> -j DROP',
    },
    {
      category: 'Malware Indicator',
      title: 'Malware Artifact & Hash Quarantine Playbook',
      severity: 'Critical',
      description: 'Host endpoint or network capture identified a file matching a known malicious SHA-256 signature.',
      mitigations: [
        {
          id: 'mw-quarantine',
          defenseType: 'QUARANTINE_HASH',
          title: 'Cluster-wide Hash Quarantine',
          description: 'Push hash to Windows Defender / Linux ClamAV & EDR sensors to immediately quarantine execution attempts.',
          automated: true,
          badgeColor: 'red',
        },
        {
          id: 'mw-isolate',
          defenseType: 'ISOLATE_HOST',
          title: 'Isolate Host Endpoint from Network',
          description: 'Sever all non-SOC outbound and lateral connections from the infected host machine until remediated.',
          automated: true,
          badgeColor: 'purple',
        },
        {
          id: 'mw-propagate',
          defenseType: 'PROPAGATE_IOC',
          title: 'Register SHA-256 in Threat Intel Feed',
          description: 'Record malware hash in local threat intelligence repository with Critical severity classification.',
          automated: true,
          badgeColor: 'blue',
        },
      ],
      recommendedCommand: 'Set-MpPreference -ThreatIDDefaultAction_Ids 2147722748 -ThreatIDDefaultAction_Actions 3',
    },
    {
      category: 'Network Anomaly',
      title: 'Machine Learning Statistical Anomaly Playbook',
      severity: 'Medium',
      description: 'Unsupervised Isolation Forest algorithm identified statistical outliers in flow duration, byte volume, or port entropy.',
      mitigations: [
        {
          id: 'ml-rate-limit',
          defenseType: 'RATE_LIMIT',
          title: 'Dynamic Traffic Shaping & Throttling',
          description: 'Throttle anomalous traffic flow to 1 Mbps to preserve overall network performance while investigating.',
          automated: true,
          badgeColor: 'amber',
        },
        {
          id: 'ml-block-ip',
          defenseType: 'BLOCK_IP',
          title: 'Precautionary Source IP Isolation',
          description: 'Temporarily block the anomalous traffic source while Deep Packet Inspection (DPI) analysis is completed.',
          automated: true,
          badgeColor: 'red',
        },
        {
          id: 'ml-propagate',
          defenseType: 'PROPAGATE_IOC',
          title: 'Flag Anomalous Flow for SOC Deep Analysis',
          description: 'Store network flow features and export raw packet capture PCAP for threat intelligence enrichment.',
          automated: true,
          badgeColor: 'blue',
        },
      ],
      recommendedCommand: 'sudo iptables -I INPUT -p tcp -m limit --limit 30/minute -j ACCEPT',
    },
  ];
};

const applyDefense = async ({
  alertId,
  nodeId = 'cluster-wide',
  category = 'Manual',
  target,
  defenseType = 'BLOCK_IP',
  actionTaken,
  appliedBy = 'SOC Analyst',
  notes = '',
}) => {
  if (!target) {
    throw new Error('Target (IP address, Hash, or Identifier) is required.');
  }

  // Generate unique defense ID
  const defenseId = `DEF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  // Default action taken string if not provided
  const actionTitle = actionTaken || `${defenseType.replace(/_/g, ' ')} deployed on ${target}`;

  // Generate concrete OS firewall rules
  const firewallRule = generateFirewallRules(target, defenseType, category);

  // Create defense record
  const defense = await SecurityDefense.create({
    defenseId,
    alertId: alertId || null,
    nodeId,
    category,
    target,
    defenseType,
    actionTaken: actionTitle,
    firewallRule,
    status: 'Active',
    appliedBy,
    notes,
  });

  // If tied to an alert, acknowledge/resolve the alert
  let updatedAlert = null;
  if (alertId) {
    const alert = await Alert.findOne({
      $or: [{ alertId }, { _id: alertId.match(/^[0-9a-fA-F]{24}$/) ? alertId : null }]
    });

    if (alert) {
      alert.status = 'Acknowledged';
      alert.acknowledgedBy = appliedBy;
      alert.acknowledgedAt = new Date();
      await alert.save();
      updatedAlert = alert;
    }
  }

  // If target is an IP or Hash, update or seed Threat Intelligence so the cluster auto-blocks it
  try {
    const isIP = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(target);
    const isHash = /^[a-fA-F0-9]{64}$/.test(target);

    if (isIP || isHash) {
      const indicatorType = isIP ? 'IP' : 'HASH_SHA256';
      const existing = await ThreatIntelligence.findOne({ indicatorValue: target });

      if (existing) {
        existing.confidence = 100;
        existing.lastSeen = new Date();
        existing.detectionCount = (existing.detectionCount || 1) + 1;
        if (!existing.associatedNodes.includes(nodeId)) {
          existing.associatedNodes.push(nodeId);
        }
        await existing.save();
      } else {
        await ThreatIntelligence.create({
          indicatorType,
          indicatorValue: target,
          confidence: 100,
          severity: category === 'Malware Indicator' || category === 'DDoS / Traffic Anomaly' ? 'Critical' : 'High',
          source: `CyberShield SOAR (${defenseType})`,
          description: `Active defense rule ${defenseId} applied by ${appliedBy}: ${actionTitle}`,
          associatedNodes: [nodeId],
        });
      }
    }
  } catch (err) {
    logger.warn(`Could not sync threat intelligence for target ${target}: ${err.message}`);
  }

  // Log system audit event
  await SystemLog.create({
    logType: 'DETECTION_TRIGGER',
    nodeId,
    message: `[ACTIVE DEFENSE] ${actionTitle} applied for ${category} targeting ${target} (${defenseId})`,
    level: 'WARN',
    details: {
      defenseId,
      alertId,
      defenseType,
      target,
      appliedBy,
    },
  });

  // Emit real-time Socket.IO events to all connected SOC clients
  const io = getSocketIO();
  if (io) {
    io.emit('defense_applied', {
      defense,
      timestamp: new Date().toISOString(),
    });

    if (updatedAlert) {
      io.emit('alert_updated', updatedAlert);
    }
  }

  logger.info(`[DEFENSE APPLIED] ${defenseId}: ${actionTitle} on ${target} by ${appliedBy}`);

  return {
    defense,
    alert: updatedAlert,
  };
};

const revokeDefense = async (id, revokedBy = 'SOC Analyst') => {
  const defense = await SecurityDefense.findOne({
    $or: [{ defenseId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }]
  });

  if (!defense) {
    throw new Error('Security defense not found');
  }

  defense.status = 'Revoked';
  defense.revokedAt = new Date();
  defense.revokedBy = revokedBy;
  await defense.save();

  // Audit log
  await SystemLog.create({
    logType: 'CONFIG_CHANGE',
    nodeId: defense.nodeId,
    message: `[ACTIVE DEFENSE REVOKED] Defense ${defense.defenseId} on ${defense.target} revoked by ${revokedBy}`,
    level: 'INFO',
    details: {
      defenseId: defense.defenseId,
      target: defense.target,
      revokedBy,
    },
  });

  const io = getSocketIO();
  if (io) {
    io.emit('defense_revoked', {
      defenseId: defense.defenseId,
      target: defense.target,
      revokedBy,
      timestamp: new Date().toISOString(),
    });
  }

  logger.info(`[DEFENSE REVOKED] ${defense.defenseId} on ${defense.target} revoked by ${revokedBy}`);

  return defense;
};

const getDefenses = async ({ status, defenseType, category, search, limit = 50, page = 1 }) => {
  const query = {};
  if (status) query.status = status;
  if (defenseType) query.defenseType = defenseType;
  if (category) query.category = category;
  if (search) {
    query.$or = [
      { defenseId: { $regex: search, $options: 'i' } },
      { target: { $regex: search, $options: 'i' } },
      { actionTaken: { $regex: search, $options: 'i' } },
      { appliedBy: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const total = await SecurityDefense.countDocuments(query);
  const defenses = await SecurityDefense.find(query)
    .sort({ appliedAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  const activeCount = await SecurityDefense.countDocuments({ status: 'Active' });
  const blockedIPCount = await SecurityDefense.countDocuments({ status: 'Active', defenseType: 'BLOCK_IP' });
  const quarantinedHashCount = await SecurityDefense.countDocuments({ status: 'Active', defenseType: 'QUARANTINE_HASH' });
  const rateLimitCount = await SecurityDefense.countDocuments({ status: 'Active', defenseType: 'RATE_LIMIT' });

  return {
    defenses,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
    stats: {
      activeCount,
      blockedIPCount,
      quarantinedHashCount,
      rateLimitCount,
    },
  };
};

module.exports = {
  applyDefense,
  revokeDefense,
  getDefenses,
  getPlaybooks,
  generateFirewallRules,
};
