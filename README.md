
# Master Thesis Quiz Test

This repository contains the experimental platform and analysis materials used for my master thesis:

**Simulacra and Simulation in Conversational AI: Effects of AI Capability and Reliability Framing on User Performance, Usage, and Perception**

## Project Overview

This project studies how users interact with a conversational AI assistant during an unfamiliar reasoning task. Participants completed a 10-question LSAT-style quiz while having access to an AI assistant.

The experiment is based on two conditions:

- **AI capability**: standard AI assistant vs. weakened AI assistant
- **Reliability framing**: aware participants vs. unaware participants

This produced four experimental groups:

- G1 = aware + weakened
- G2 = aware + standard
- G3 = unaware + weakened
- G4 = unaware + standard

The collected data were analyzed to examine effects on:

- quiz performance
- AI usage frequency
- post-quiz perception

## Repository Contents

### Experimental Platform

The repository contains the source code of the web-based experimental platform. The platform includes:

- consent screen
- username screen
- instruction carousel
- LSAT-style quiz interface
- AI assistant chat window
- post-task questionnaire
- final score screen
- group assignment logic
- data-saving logic

Main technologies used:

- HTML
- CSS
- JavaScript
- Node.js
- Express
- Supabase

### Analysis Materials

The statistical analysis is provided in two formats:

- `dataVisualizationsFinal.pdf`  
  Static PDF version of the complete notebook. This file can be opened directly to read the analysis without re-running the code.

- `dataVisualizationsFinal.ipynb`  
  Executable Jupyter Notebook version. This file can be opened with Jupyter Notebook or Google Colab.

## How to Read the Analysis

To inspect the complete analysis without running any code, yoy can preview:

```text
dataVisualizationsFinal.ipynb
````

or if any problem, open:

```text
dataVisualizationsFinal.pdf
````

This PDF contains the data preparation, exploratory visualizations, statistical tests, and effect size calculations.

## How to Run the Notebook

To run the notebook:

1. Open `dataVisualizationsFinal.ipynb` in Google Colab or Jupyter Notebook.
2. Make sure the required CSV files are available in the notebook environment.
3. If using Google Colab, upload the CSV files to the `/content/` directory or adapt the file paths in the notebook.

The notebook expects the following datasets:

```text
sessions_rows.csv
quiz_results_rows.csv
tcs_results_rows.csv
ai_interactions_rows.csv
```

These datasets correspond to:

* participant session and group information
* quiz answers and correctness
* post-task Likert-scale responses
* AI interaction logs

Enjoy : )
