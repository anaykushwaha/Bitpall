export const DEFAULT_POLICY = `workspace corporate_network {
  asset endpoint finance_laptop {
    criticality = "high";
  }

  telemetry edr {
    source = "endpoint-agent";
  }

  telemetry filesystem {
    source = "file-monitor";
  }

  rule suspicious_encryption_chain {
    observe process_start where process.name == "powershell.exe";

    then file_write
      where file.extension == ".encrypted"
      within 2m;

    require confidence >= 0.80;
    require sources >= 2;

    respond {
      isolate endpoint finance_laptop;
      preserve evidence;
      approval required for terminate_process;
    }

    rollback {
      reconnect endpoint finance_laptop;
    }
  }

  test ransomware_sequence {
    expect rule suspicious_encryption_chain to_match;
  }
}
`;

export const DEFAULT_EVENTS_JSON = `[
  {
    "id": "evt-1",
    "type": "process_start",
    "timestamp": "2026-08-06T12:00:00.000Z",
    "source": "endpoint-agent",
    "confidence": 0.92,
    "properties": {
      "process": { "name": "powershell.exe", "pid": 4412 }
    }
  },
  {
    "id": "evt-2",
    "type": "file_write",
    "timestamp": "2026-08-06T12:00:45.000Z",
    "source": "file-monitor",
    "confidence": 0.88,
    "properties": {
      "file": {
        "extension": ".encrypted",
        "path": "C:\\\\Users\\\\finance\\\\reports\\\\q2.xlsx.encrypted"
      }
    }
  }
]
`;
