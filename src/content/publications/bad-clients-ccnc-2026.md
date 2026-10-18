---
year: "2026"
venue: "IEEE 23rd Consumer Communications & Networking Conference (CCNC)"
venue_type: conference
title: "How to Improve Federated Learning in Consumer Applications? Detect and Exclude Bad Clients"
authors: "R. Zatsarenko, S. Chuprov, D. Korobeinikov, L. Reznik, A. Peña"
author_ids:
  - raman-zatsarenko
  - sergei-chuprov
  - dmitrii-korobeinikov
  - leon-reznik
link: { label: "DOI ↗", href: "https://doi.org/10.1109/CCNC65079.2026.11366313" }
---

Federated Learning (FL), an emerging decentralized Machine Learning (ML) approach, offers an effective avenue for training models on distributed data while safeguarding consumer privacy. Nevertheless, adversarial attacks initiated by malicious clients gaining access to confidential consumer data may deteriorate the learning process and performance. We develop the novel MADE-PI technique for the conventional FL that identifies and excludes malicious clients in the early model training phases. Our method incurs a novel local models' preprocessing step performed before the aggregation procedure, in which we analyze the distribution of PI scores assigned to each client and exclude potentially poisoned data sources. We introduce Proportional-Integral (PI) scores as distance-based detection metrics inspired by PID control that consider the current distance between clients and the history of distances, through the proportional and integral terms respectively. Our empirical study on three distinct consumer application FL datasets, which represent use-cases from the intelligent transportation, handwriting recognition and medical scenarios, verifies that our approach is successful in identification and removal of compromised clients, mitigating threats to consumer model integrity and the application performance. The possible gain in learning effectiveness and efficiency against conventional methods is evaluated and analyzed.
