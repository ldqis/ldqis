---
name: QFL Privacy
tagline: When do variational quantum circuits keep federated training data private?
tags: ["Federated Learning", "Quantum ML"]
stack: ["Python", "PennyLane", "Qiskit", "JAX"]
desc: "Federated clients share gradients instead of data, and on classical networks those gradients can be inverted to rebuild the training inputs. For variational quantum circuits the literature disagrees. This project maps where each claim holds, across encoding depth, trainable layers, batch size, and simulated <strong>IBM Heron</strong> device noise, using gradient-matching attacks on 4- and 8-qubit circuits. A course project for <strong>CSCI-739 Quantum Machine Learning</strong>, Fall 2026."
links:
  - { label: "GitHub ↗", href: "https://github.com/ajbarea/csci739-qfl-privacy" }
order: 6
contributors:
  - aj-barea
---
