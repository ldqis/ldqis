---
year: "2025"
venue: "International Conference on Machine Learning and Applications (ICMLA)"
venue_type: conference
title: "MADE-PI: Framework for Effective Anomaly Detection in Federated Learning Applications"
authors: "R. Zatsarenko, S. Chuprov, D. Korobeinikov, L. Reznik, A. Peña"
author_ids:
  - raman-zatsarenko
  - sergei-chuprov
  - dmitrii-korobeinikov
  - leon-reznik
link: { label: "DOI ↗", href: "https://doi.org/10.1109/ICMLA66185.2025.00067" }
featured: true
---

In this research, we address a critical vulnerability of Federated Learning (FL) in practical applications: their susceptibility to adversarial attacks from malicious participants, which can severely degrade a global model's performance. We propose MADE-PI, a novel defense mechanism designed to identify and exclude malicious clients early in the training process. Our method introduces a pre-aggregation step where the server evaluates each client update using a Proportional-Integral (PI) score. This score is a unique distance-based metric inspired by the PID controller, where a proportional term P measures the immediate deviation of a client's update, and an integral term I tracks its behavior over time. By analyzing the distribution of these scores, our technique effectively flags and removes malicious contributions. We validate our approach through an empirical study on three datasets representing various applications of FL, including intelligent transportation, medical image analysis, and handwriting recognition. We concentrate on data poisoning as a highly relevant class of attacks. The results demonstrate that MADE-PI outperforms conventional defenses by providing superior malicious client detection and improving both learning efficiency and final model accuracy.
