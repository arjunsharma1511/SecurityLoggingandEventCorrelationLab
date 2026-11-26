"use strict";

const DATE = "2026-11-18";
const sources = {
  Firewall: { colour: "#ffb789", meaning: "Action describes what the firewall did with a connection. A deny does not tell you whether an account authenticated." },
  Identity: { colour: "#c8adff", meaning: "Result describes authentication at this identity service. Account labels identify accounts, and activity still needs context to attribute to a person." },
  VPN: { colour: "#f6acff", meaning: "A VPN session record can connect an account, public address and assigned tunnel address." },
  Server: { colour: "#84e8ff", meaning: "Read the server action and result separately. Access to a folder, full file reads and transfers are different observations." },
  Endpoint: { colour: "#a8f3c1", meaning: "Endpoint telemetry describes what the device sensor observed. Check the sensor coverage before claiming absence." },
  Proxy: { colour: "#ffda8f", meaning: "The proxy records traffic for a connection. In this lab, bytes_sent is client-to-destination and bytes_received is the reverse." },
  DNS: { colour: "#98e7db", meaning: "A query or response describes name resolution. A returned address alone does not establish a session." },
  Ticket: { colour: "#b7c9fc", meaning: "Read the scope and time of the documented approval. A ticket covers the named activity." },
  SIEM: { colour: "#d6b3fb", meaning: "This is a derived alert rather than a source-device observation. Verify its group fields and original records." }
};

function event(id, source, host, time, arrival, headline, fields, offset = "Z") {
  const originalTime = `${DATE}T${time}${offset}`;
  const utc = new Date(originalTime).toISOString().slice(11, 19);
  let raw;
  if (source === "Firewall") {
    const data = { time: originalTime, device: host, ...fields };
    raw = Object.keys(data).join(",") + "\n" + Object.values(data).join(",");
  } else if (source === "Server" || source === "Endpoint") {
    raw = Object.entries({ Recorded: originalTime, Computer: host, ...fields })
      .map(([key, value]) => `${key}: ${value}`).join("\n");
  } else {
    raw = JSON.stringify({ timestamp: originalTime, emitter: host, ...fields }, null, 2);
  }
  return { id, source, host, utc, arrival, originalTime, headline, fields, raw };
}

function q(prompt, choices, answer, explanation) {
  return { prompt, choices, answer, explanation };
}

function task(title, scope, ids, questions, hint, settings = {}) {
  return { title, scope, ids, questions, hint, ...settings };
}

const auditOptions = ["Supported", "Contradicted", "Not established"];
const findingTypes = ["Confirmed fact", "Reasonable interpretation", "Unresolved question"];

const cases = [
  {
    title: "One red event", topic: "Read the source",
    brief: "A user reports that the scheduling app froze around 09:15 UTC. The SIEM also shows a denied connection. Identify which record answers each question and preserve the supplied originals.",
    events: [
      event("L01", "Firewall", "EDGE-01", "09:14:55", "09:14:56", "Inbound connection denied", { src_ip: "198.51.100.29", dst_ip: "10.30.5.71", dst_port: 3389, action: "deny", rule: "block-external-remote-desktop" }),
      event("L02", "Server", "APP-SCHED-01", "09:15:03", "09:15:07", "Application request failed", { user: "mira", service: "scheduling", result: "backend timeout", upstream: "DB-SCHED-01", request_id: "req-17" }),
      event("L03", "Identity", "ID-SVC", "09:14:40", "09:14:43", "Sign-in succeeded", { user: "mira", src_ip: "10.30.4.22", outcome: "success", application: "scheduling" }),
      event("L04", "DNS", "RESOLVER-01", "09:14:41", "09:14:42", "Approved app name resolved", { client: "10.30.4.22", query: "schedule.example", answer: "10.30.5.16" }),
      event("L05", "Endpoint", "HR-LT-22", "09:15:09", "09:15:12", "Scheduled inventory completed", { device_ip: "10.30.4.22", task: "asset inventory", outcome: "completed" }),
      event("L06", "Ticket", "HELPDESK", "09:16:00", "09:16:02", "User reports frozen scheduling page", { user: "mira", service: "scheduling", ticket: "HD-41", description: "Page hung at about 09:15 UTC." })
    ],
    tasks: [
      task("Scope the report", "Pin the help-desk report and the scheduling server’s error. Choose the first question to investigate.", ["L06", "L02"], [
        q("Which scope fits the report?", ["Investigate every blocked connection today.", "Check the scheduling request and backend around 09:15 UTC.", "Investigate every HR device."], 1, "The ticket identifies a service, user and time. The server error gives a relevant request and backend.")
      ], "Search for scheduling. The server and ticket each contribute a different part of the scope."),
      task("Read the firewall action", "Pin the original firewall record. Explain what its action field records.", ["L01"], [
        q("What does the record show?", ["The connection to TCP/3389 was denied by EDGE-01.", "Mira successfully used Remote Desktop.", "The source entered an invalid password."], 0, "The firewall observed and denied a connection. Authentication outcomes come from a service that records identity.")
      ], "Check the source device and action field in the original log."),
      task("Separate a service error from a security lead", "Pin the scheduling error and Mira’s successful scheduling sign-in.", ["L02", "L03"], [
        q("What is a proportionate first response?", ["Disable the scheduling service.", "Declare the laptop compromised.", "Check the backend timeout and route the app issue to its owner."], 2, "The sign-in succeeded and the app reports a backend timeout. The cause of that timeout remains open.")
      ], "Compare result fields. Successful authentication and an app error can happen in the same visit."),
      task("Preserve the supplied originals", "Prepare the original snapshot in the evidence panel. Pin the server error that belongs in the troubleshooting note.", ["L02"], [
        q("What should the shared evidence copy retain?", ["Only your paraphrase of the error.", "Original log text, source and timestamps, with notes kept separately.", "Only the latest event."], 1, "Keeping original records and timestamps lets another analyst repeat the review.")
      ], "Use Prepare original snapshot. Your filters and pins are a working view.", { preserve: true })
    ]
  },
  {
    title: "A clock out of order", topic: "Normalise time",
    brief: "A remote engineer connects from a gateway that logs local time at UTC+05:30. The identity events reach the SIEM after a temporary forwarding delay. Reconstruct what happened using UTC event time.",
    events: [
      event("T01", "Identity", "ID-SVC", "10:02:00", "10:09:00", "Two failed sign-ins", { user: "devon", src_ip: "198.51.100.60", failures: 2, result: "failure" }),
      event("T02", "VPN", "VPN-APAC", "15:35:00", "10:05:05", "VPN session opened", { user: "devon", src_ip: "198.51.100.60", assigned_ip: "10.30.9.19", session: "V-205", mfa: "passed" }, "+05:30"),
      event("T03", "Server", "ENG-FILE-02", "10:07:15", "10:07:17", "Engineering folder listed", { user: "devon", client_ip: "10.30.9.19", action: "list_directory", result: "success" }),
      event("T04", "Firewall", "INT-FW-02", "10:06:30", "10:06:31", "Connection permitted", { src_ip: "10.30.9.19", dst_ip: "10.30.5.42", dst_port: 445, action: "allow" }),
      event("T05", "Ticket", "HELPDESK", "10:10:20", "10:10:21", "Forwarder backlog recorded", { system: "ID-SVC", window_utc: "10:00–10:09", detail: "Delayed forwarding. Source clock synchronisation verified." }),
      event("T06", "Proxy", "WEB-PROXY", "10:06:50", "10:06:51", "Unrelated portal request", { user: "mira", client_ip: "10.30.4.22", destination: "portal.example", action: "allow" })
    ],
    tasks: [
      task("Translate the gateway clock", "Pin Devon’s VPN session. Read the original timestamp including its offset.", ["T02"], [
        q("What is 15:35:00 at UTC+05:30 in UTC?", ["15:35:00 UTC", "21:05:00 UTC", "10:05:00 UTC"], 2, "Subtract five hours and thirty minutes. The original local time remains available in the record.")
      ], "Compare Original source record with Event time in the detail panel."),
      task("Compare arrival with event time", "Pin the failed sign-ins and the forwarder backlog ticket. Check when the failures occurred and when they arrived.", ["T01", "T05"], [
        q("Why can the failure appear after the VPN session in arrival order?", ["The identity logs were forwarded late.", "The VPN success changed the identity record timestamp.", "Devon moved the firewall clock."], 0, "The identity event occurred at 10:02 UTC and arrived at 10:09 UTC. The ticket documents delayed delivery.")
      ], "Try both options in Sort events. Collate the UTC event fields using the ticket."),
      task("Reconstruct the connection", "Pin the failures, VPN session, firewall permission and server listing. Arrange all four from earliest to latest UTC event time.", ["T01", "T02", "T04", "T03"], [
        q("Which time belongs in your investigation sequence?", ["The time the analyst opened the record.", "The source event time normalised to UTC.", "Always the latest SIEM arrival time."], 1, "UTC event time puts the failure, VPN success, firewall action and folder listing in the observed sequence.")
      ], "The failures arrived last among the four. Use the timestamps on the pinned cards.", { ordered: true }),
      task("Carry the address across sources", "Pin the VPN session and the server listing. Find the address that lets you compare the two.", ["T02", "T03"], [
        q("Which field pair links these records?", ["VPN assigned_ip and server client_ip both equal 10.30.9.19.", "The gateway name matches the server name.", "Both raw times use the same clock format."], 0, "The tunnel assignment and the server client address link Devon’s VPN session to the server observation.")
      ], "Open the two original records and compare the VPN’s assigned address with the server’s client address.")
    ]
  },
  {
    title: "The shared address", topic: "Test a correlation",
    brief: "A SIEM rule grouped a failure and a success from one public IP over two minutes. Compare the accounts, devices and sessions. Then check a second burst for a stronger match.",
    events: [
      event("C01", "Identity", "ID-SVC", "11:00:08", "11:00:09", "Password failed", { user: "jan", src_ip: "203.0.113.52", device: "KIOSK-09", request_id: "rq-801", result: "failure" }),
      event("C02", "VPN", "VPN-EDGE", "11:01:02", "11:01:03", "VPN success", { user: "ravi", src_ip: "203.0.113.52", device: "OPS-LT-04", session: "V-310", assigned_ip: "10.30.9.31" }),
      event("C03", "SIEM", "SIEM-RULE-12", "11:01:04", "11:01:04", "Failure followed by success", { group_field: "src_ip", group_value: "203.0.113.52", rule_window: "2 minutes", evidence: "C01; C02" }),
      event("C04", "Ticket", "NET-OPS", "10:50:00", "10:50:04", "Branch egress inventory", { public_ip: "203.0.113.52", note: "Visitor kiosk and staff workstations share this outbound NAT address." }),
      event("C05", "Identity", "ID-SVC", "11:09:10", "11:09:11", "Several password failures", { user: "jan", device: "KIOSK-09", src_ip: "203.0.113.52", request_id: "rq-832", failure_count: 5 }),
      event("C06", "Identity", "ID-SVC", "11:09:38", "11:09:40", "Second-factor prompt declined", { user: "jan", device: "KIOSK-09", src_ip: "203.0.113.52", request_id: "rq-832", result: "declined" })
    ],
    tasks: [
      task("Inspect the automatic lead", "Pin the derived SIEM alert. Identify the field the rule actually used to group the events.", ["C03"], [
        q("What created the alert?", ["The rule matched two people’s device IDs.", "The rule verified control of an account.", "The rule grouped recent events by source IP."], 2, "The grouping key generated a lead. The record does not establish that both events share an account or device.")
      ], "Find group_field in the alert log."),
      task("Compare the original events", "Pin the first password failure and the VPN success grouped by the alert.", ["C01", "C02"], [
        q("What weakens the suggested relationship?", ["The events share an address but name different accounts and devices.", "The events have identical request IDs.", "The original records report the same session."], 0, "The source IP alone does not establish a common device, account or session.")
      ], "Compare user and device side by side."),
      task("Add the network context", "Pin the branch inventory ticket and the SIEM alert.", ["C04", "C03"], [
        q("What context should be added to the alert triage note?", ["The IP uniquely identifies Ravi.", "The address is shared across devices. Treat the IP-only correlation as weak.", "The ticket confirms the sign-in failed for Ravi."], 1, "Shared network address translation can put unrelated activity behind one public IP. Compare precise identifiers.")
      ], "The ticket explains why two different devices show the same address."),
      task("Find the stronger link", "Pin Jan’s later failure burst and declined prompt. Compare identifiers and explain the next step.", ["C05", "C06"], [
        q("Which follow-up is best supported?", ["Close the case because the IP is shared.", "Reassign Ravi’s success to Jan.", "Review Jan’s events together using the matching request ID, account and device."], 2, "Several specific fields tie this pair together, including the same request ID. Check the identity owner and related records before concluding why it happened.")
      ], "Filter for rq-832 and compare the two event types.")
    ]
  },
  {
    title: "The after-hours session", topic: "Build the chain",
    brief: "A rule linked repeated failures to a VPN success for the finance account nia. The alert does not show what the new session reached. Review 22:00–22:20 UTC and connect the original records.",
    events: [
      event("N01", "Identity", "ID-SVC", "22:02:00", "22:02:01", "Repeated failed sign-ins", { user: "nia", src_ip: "198.51.100.23", failure_count: 5, app: "vpn", result: "failure" }),
      event("N02", "VPN", "VPN-EDGE", "22:05:00", "22:05:01", "VPN session opened", { user: "nia", src_ip: "198.51.100.23", device: "FIN-LT-14", session: "V-902", assigned_ip: "10.30.9.44", mfa: "passed" }),
      event("N03", "Server", "FIN-FILE-01", "22:08:00", "22:08:04", "Restricted folder listed", { user: "nia", client_ip: "10.30.9.44", resource: "finance-quarterly", operation: "list_directory", result: "success" }),
      event("N04", "Proxy", "WEB-PROXY", "22:15:00", "22:15:08", "Large outbound flow completed", { client_ip: "10.30.9.44", destination: "203.0.113.10", action: "allow", bytes_sent: 629145600, bytes_received: 4928 }),
      event("N05", "Ticket", "HELPDESK", "21:58:00", "21:58:05", "Expected finance maintenance", { system: "FIN-BACKUP-01", window_utc: "22:00–22:30", approved_destination: "198.51.100.46", note: "Approval is for the backup server only." }),
      event("N06", "SIEM", "SIEM-RULE-08", "22:05:04", "22:05:04", "Repeated failure and success lead", { user: "nia", linked_events: "N01; N02", priority: "review" }),
      event("N07", "Endpoint", "FIN-LT-14", "22:07:18", "22:07:19", "Process telemetry coverage missing", { sensor: "endpoint-agent", gap_start_utc: "22:07:18", detail: "Process collector temporarily offline." })
    ],
    tasks: [
      task("Confirm the alert inputs", "Pin the original failure and VPN-success records. Hold the SIEM summary aside.", ["N01", "N02"], [
        q("What matches those two source records?", ["Same user and public source address, followed by a VPN session.", "Same device address as the finance server.", "They document an outbound upload."], 0, "Two original sources support the failure-to-success sequence. The success alone cannot explain who was using the account.")
      ], "Use the alert to find the event IDs, then pin the records the alert names."),
      task("Follow the tunnel address", "Pin the VPN, server and proxy records. Put them in UTC event-time order.", ["N02", "N03", "N04"], [
        q("Which value connects the successful session to later observations?", ["198.51.100.46", "10.30.9.44", "V-902 appears in all three originals."], 1, "The VPN assigns 10.30.9.44 and the same address appears as client_ip in the server and proxy records.")
      ], "Find assigned_ip in the VPN original, then search for it.", { ordered: true }),
      task("Read the byte direction", "Pin the folder-listing record and proxy transfer record.", ["N03", "N04"], [
        q("What can you confirm with these two records?", ["All files in the folder were copied to the destination.", "The proxy intercepted a password.", "The folder was listed and the proxy recorded 600 MiB outbound. File contents remain unknown."], 2, "The original server action is list_directory. Client-to-destination bytes show transfer volume, and neither record identifies the transferred contents.")
      ], "Compare operation with bytes_sent. The value 629,145,600 bytes is 600 MiB."),
      task("Decide when to escalate", "Pin the VPN, server, proxy and endpoint-gap records. Prepare the original snapshot.", ["N02", "N03", "N04", "N07"], [
        q("What is a proportionate response?", ["Escalate the sequence with the evidence, then seek endpoint or file-audit records.", "Confirm the user stole the folder and remove the laptop’s data.", "Close the case because MFA passed."], 0, "The sequence warrants further review. The process-telemetry gap and unknown contents belong in the hand-off.")
      ], "Use strong linked observations and explicitly call out missing telemetry.", { preserve: true })
    ]
  },
  {
    title: "Audit the AI draft", topic: "Verify claims",
    brief: "A simulated assistant summarised a remote-access report. The draft contains accurate statements, a reversed byte count and claims the available logs cannot establish. Review its claims one by one.",
    events: [
      event("A01", "VPN", "VPN-EDGE", "13:03:12", "13:03:13", "VPN session opened", { user: "alex", src_ip: "198.51.100.91", assigned_ip: "10.30.9.51", session: "V-461", mfa: "passed" }),
      event("A02", "Proxy", "WEB-PROXY", "13:04:06", "13:04:11", "Large transfer recorded", { client_ip: "10.30.9.51", destination: "patch.example", bytes_sent: 1024, bytes_received: 314572800, action: "allow" }),
      event("A03", "Server", "OPS-FILE-01", "13:04:40", "13:04:42", "Payroll folder access denied", { user: "alex", client_ip: "10.30.9.51", resource: "payroll", operation: "open_folder", result: "denied" }),
      event("A04", "DNS", "RESOLVER-01", "13:03:41", "13:03:42", "Patch service lookup", { client: "10.30.9.51", query: "patch.example", answer: "198.51.100.78" }),
      event("A05", "Ticket", "CHANGE-LOG", "12:50:00", "12:50:04", "Approved update window", { service: "patch.example", approved_window_utc: "13:00–13:30", permitted_group: "managed ops laptops" }),
      event("A06", "Endpoint", "EDR-COLLECTOR", "13:05:00", "13:05:03", "Scope of supplied endpoint evidence", { asset: "OPS-LT-51", coverage: "process and file telemetry not supplied in this exercise" })
    ],
    tasks: [
      task("Open the draft’s cited VPN record", "Pin the VPN session. Compare both claims with its original fields.", ["A01"], [
        q("AI claim: “Alex’s session was assigned 10.30.9.51.”", auditOptions, 0, "The VPN event records alex and assigned_ip 10.30.9.51."),
        q("AI claim: “Alex’s MFA failed.”", auditOptions, 1, "The original VPN record says mfa passed.")
      ], "Supported claims match the source. Contradicted claims conflict with it.", { audit: true }),
      task("Catch two confident errors", "Pin the proxy and payroll-server originals. Verify the assistant’s claims about direction and result.", ["A02", "A03"], [
        q("AI claim: “The proxy recorded a 300 MiB upload from the VPN client.”", auditOptions, 1, "The original records 300 MiB received by the client and only 1,024 bytes sent."),
        q("AI claim: “The payroll folder was opened successfully in this event.”", auditOptions, 1, "The original folder operation says denied.")
      ], "Read the original field values. The dashboard says large transfer without specifying the direction.", { audit: true }),
      task("Mark an unknown honestly", "Pin the proxy record and endpoint coverage note. Assess what the supplied data can and cannot establish.", ["A02", "A06"], [
        q("AI claim: “The installed package passed a local signature check.”", auditOptions, 2, "The proxy does not record local file verification and the relevant endpoint telemetry is missing."),
        q("AI claim: “The proxy allowed a connection to patch.example.”", auditOptions, 0, "The destination and action fields support the claim.")
      ], "Use Not established when neither the claim nor its opposite follows from the evidence.", { audit: true }),
      task("Approve only a bounded summary", "Pin the proxy record and the approved update ticket. Select a safe use of AI and a final interpretation.", ["A02", "A05"], [
        q("Which use of AI is appropriate under approved policy?", ["Send raw protected logs to a public tool.", "Use approved, permitted evidence to draft a summary, then verify every claim yourself.", "Let the draft decide the escalation automatically."], 1, "Use approved tools and permitted inputs. The analyst owns the interpretation."),
        q("What can you say about the large transfer?", ["The event fits an approved update window, and the downloaded package and local outcome still need verification.", "The event proves the source was malicious.", "The AI draft establishes the transfer contents."], 0, "The destination, timing and direction fit the approved activity. Those details do not verify the package.")
      ], "Use the change record for scope and the proxy for direction.")
    ]
  },
  {
    title: "Final analyst shift", topic: "Hand off the case",
    brief: "Investigate the 17:40–18:00 UTC alert around shipping laptop SHIP-LT-06. A scheduled backup ran at the same time. Establish which account, addresses and observations belong together, then hand off a bounded finding.",
    events: [
      event("F01", "Identity", "ID-SVC", "17:42:14", "17:42:16", "Repeated remote sign-in failures", { user: "leah", src_ip: "198.51.100.64", result: "failure", failure_count: 4, app: "vpn" }),
      event("F02", "VPN", "VPN-EDGE", "17:44:20", "17:44:21", "VPN session opened", { user: "leah", src_ip: "198.51.100.64", assigned_ip: "10.30.9.66", device: "SHIP-LT-06", session: "V-768", mfa: "passed" }),
      event("F03", "Server", "SHIP-FILE-01", "17:48:10", "17:48:13", "Order file read recorded", { user: "leah", client_ip: "10.30.9.66", operation: "read", object: "orders-week.csv", result: "success" }),
      event("F04", "Proxy", "WEB-PROXY", "17:52:00", "17:53:09", "Outbound transfer to unlisted service", { client_ip: "10.30.9.66", destination: "relay.example", bytes_sent: 75497472, bytes_received: 2602, action: "allow" }),
      event("F05", "Proxy", "WEB-PROXY", "17:48:21", "17:48:28", "Scheduled backup transfer", { client_ip: "10.30.8.15", destination: "store.example", bytes_sent: 1073741824, bytes_received: 4768, action: "allow" }),
      event("F06", "Ticket", "CHANGE-LOG", "17:35:00", "17:35:02", "Shipping maintenance scope", { permitted_upload: "10.30.8.15 => store.example", window_utc: "17:40–18:00", note: "relay.example is absent from the approved shipping profile." }),
      event("F07", "Endpoint", "EDR-COLLECTOR", "17:50:00", "17:50:01", "Endpoint sensor stopped reporting", { device: "SHIP-LT-06", last_heartbeat_utc: "17:49:51", coverage: "process evidence unavailable after this time" }),
      event("F08", "SIEM", "SIEM-RULE-09", "17:53:12", "17:53:12", "Shipping remote access lead", { candidate_user: "leah", primary_events: "F01; F02; F04", disposition: "analyst review required" })
    ],
    tasks: [
      task("Keep both flows separate", "Pin the two proxy events and the maintenance ticket. Identify which flow matches the approved source and destination.", ["F04", "F05", "F06"], [
        q("Which transfer fits the ticket?", ["Both transfers, because the time overlaps.", "10.30.8.15 to store.example, the documented backup.", "10.30.9.66 to relay.example, because that flow is smaller."], 1, "The backup matches host, destination and time. The other flow needs independent review.")
      ], "Compare client_ip and destination against the ticket, in addition to the time."),
      task("Build the hand-off timeline", "Pin Leah’s identity failures, VPN session, file read and proxy transfer to relay.example. Arrange earliest to latest UTC event time.", ["F01", "F02", "F03", "F04"], [
        q("Which joins connect the sequence?", ["The date and the names of the log sources.", "A common backup destination.", "Account and public IP link identity to VPN. The assigned IP links VPN to server and proxy."], 2, "The timestamps and identifiers make a stronger link than proximity. The backup never uses the VPN’s assigned client address.")
      ], "Search leah, then 10.30.9.66. Keep the four originals in order.", { ordered: true }),
      task("Separate fact, interpretation and unknown", "Pin the file read, relay.example transfer and endpoint coverage gap. Label each line in your draft.", ["F03", "F04", "F07"], [
        q("“SHIP-FILE-01 recorded a successful read of orders-week.csv.”", findingTypes, 0, "The file server reports a read and a successful result."),
        q("“The nearby read and outbound transfer warrant investigating a possible data exposure.”", findingTypes, 1, "This cautious interpretation follows from several observations. The exact content remains unclear."),
        q("“Which process sent the bytes, and was the transfer carrying that file?”", findingTypes, 2, "Proxy byte counts do not describe file contents. Endpoint process coverage was missing at the transfer time.")
      ], "A fact is directly recorded. An interpretation explains why it matters. A question names missing evidence."),
      task("Brief the incident lead", "Prepare the final case’s original snapshot. Pin the VPN, file read, proxy transfer and endpoint coverage gap.", ["F02", "F03", "F04", "F07"], [
        q("What is the strongest hand-off?", ["Escalate the linked session and unexpected outbound transfer. Preserve originals, document the endpoint gap and ask the incident lead to assess scope and content.", "Declare every shipping file stolen.", "Close the alert because one scheduled backup ran nearby."], 0, "Escalate with time, account, session, address, evidence IDs and open questions. The incident lead can pursue approved evidence and response.")
      ], "The linked observations justify escalation. Check which claims stay within the supplied evidence.", { preserve: true })
    ]
  }
];
