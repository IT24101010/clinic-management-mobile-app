import json
import os

notebook_path = r"d:\SLIIT\YS SEM 02\AI ML Project\Project\ML-Assisted-Clinic-Management-System\ai-service\notebooks\engine1_risk_prediction_training.ipynb"

try:
    with open(notebook_path, "r", encoding="utf-8") as f:
        nb = json.load(f)

    for cell in nb.get("cells", []):
        if cell["cell_type"] != "code":
            continue
        source_text = "".join(cell.get("source", []))
        
        # Fix Heart Disease Data Load
        if "# LOAD HEART DISEASE DATASET" in source_text:
            cell["source"] = [
                "# ============================================================\n",
                "# LOAD HEART DISEASE DATASET (UCI Cleveland)\n",
                "# ============================================================\n",
                "df_heart = pd.read_csv('datasets/heart_disease_uci.csv')\n",
                "\n",
                "# 1. Rename columns to match what the notebook expects\n",
                "df_heart = df_heart.rename(columns={'num': 'target', 'thalch': 'thalach'})\n",
                "\n",
                "# 2. Drop metadata columns that shouldn't be used for ML training\n",
                "if 'id' in df_heart.columns:\n",
                "    df_heart = df_heart.drop(columns=['id', 'dataset'])\n",
                "\n",
                "print(f'Heart disease dataset shape: {df_heart.shape[0]} rows x {df_heart.shape[1]} columns')\n",
                "print(f'\\nColumns: {list(df_heart.columns)}')\n",
                "print(f'\\nTarget distribution:')\n",
                "print(df_heart['target'].value_counts())\n",
                "df_heart.head()\n"
            ]
            
        # Fix Folder Structure Path
        if "# CREATE FOLDER STRUCTURE" in source_text:
            if "os.chdir('..')" not in source_text:
                cell["source"] = [
                    "# ============================================================\n",
                    "# CREATE FOLDER STRUCTURE\n",
                    "# ============================================================\n",
                    "import os\n",
                    "if os.path.basename(os.getcwd()) == 'notebooks':\n",
                    "    os.chdir('..')\n",
                    "\n",
                    "os.makedirs('datasets', exist_ok=True)\n",
                    "os.makedirs('models', exist_ok=True)\n",
                    "\n",
                    "print(f\"Current working directory: {os.getcwd()}\")\n",
                    "print('Folder structure ready!')\n"
                ]

    with open(notebook_path, "w", encoding="utf-8") as f:
        json.dump(nb, f, indent=1)
        
    print("Successfully patched notebook.")
except Exception as e:
    print(f"Error repairing notebook: {e}")
