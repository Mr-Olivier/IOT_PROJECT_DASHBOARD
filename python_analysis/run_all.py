"""
AquaSense IoT — Full Analysis Pipeline
Runs all steps (00 → 08) in sequence, executes the Jupyter notebook so all
charts and tables are saved into AquaSense_Analysis.ipynb, then opens it.

Usage:
    python run_all.py                 # run pipeline + execute notebook + open Jupyter
    python run_all.py --no-jupyter    # run pipeline only (skip notebook + Jupyter)
    python run_all.py --watch 60      # re-run every 60 seconds (live refresh)
"""
import subprocess, sys, os, time, shutil

def _ensure_nbconvert():
    """Install nbconvert + nbformat if not already present."""
    for pkg in ("nbconvert", "nbformat"):
        try:
            __import__(pkg)
        except ImportError:
            print(f"  Installing {pkg}...")
            subprocess.run([sys.executable, "-m", "pip", "install", "--quiet", pkg], check=True)
            print(f"  {pkg} installed.")

# ── Pipeline steps in order ───────────────────────────────────────────────────
STEPS = [
    ("Step 0  — Exporting latest data from PostgreSQL", "00_export_data.py"),
    ("Step 1  — Cleaning & preparing data",             "01_cleaning.py"),
    ("Step 2  — Augmenting data (bootstrap sampling)",  "02_augmentation.py"),
    ("Step 3  — Summary statistics",                    "03_summary_stats.py"),
    ("Step 4  — Exploratory data analysis (EDA)",       "04_eda.py"),
    ("Step 5  — Correlation analysis",                  "05_correlation.py"),
    ("Step 6  — Training ML models",                    "06_models.py"),
    ("Step 7  — Business rules & decision logic",       "07_decision_logic.py"),
    ("Step 8  — Model comparison (cross-validation)",   "08_model_comparison.py"),
]

HERE = os.path.dirname(os.path.abspath(__file__))
DIVIDER = "=" * 62

def banner(text):
    print(f"\n{DIVIDER}")
    print(f"  {text}")
    print(DIVIDER)

def run_step(label, script):
    banner(label)
    t0 = time.time()
    result = subprocess.run(
        [sys.executable, script],
        cwd=HERE,
    )
    elapsed = time.time() - t0
    if result.returncode != 0:
        print(f"\n[ERROR] {script} failed (exit code {result.returncode})")
        print("  Fix the error above, then re-run:  python run_all.py")
        sys.exit(result.returncode)
    print(f"\n  Done in {elapsed:.1f}s")

def copy_plots_to_public():
    """Copy generated plots to Next.js public folder so the dashboard can display them."""
    src  = os.path.join(HERE, "plots")
    dest = os.path.join(HERE, "..", "public", "analysis-plots")
    os.makedirs(dest, exist_ok=True)
    copied = 0
    for f in os.listdir(src):
        if f.endswith(".png"):
            shutil.copy2(os.path.join(src, f), os.path.join(dest, f))
            copied += 1
    print(f"\n  Copied {copied} plots -> public/analysis-plots/  (dashboard will display them)")


def run_pipeline():
    banner("AquaSense IoT — Full Analysis Pipeline")
    print(f"  Working dir : {HERE}")
    print(f"  Python      : {sys.executable}")

    t_total = time.time()

    for label, script in STEPS:
        run_step(label, script)

    copy_plots_to_public()

    total = time.time() - t_total
    print(f"\n{DIVIDER}")
    print(f"  Pipeline complete in {total:.0f}s")
    print(f"  Plots  -> python_analysis/plots/  +  public/analysis-plots/")
    print(f"  Data   -> python_analysis/data/")
    print(DIVIDER)

def execute_notebook():
    """
    Run all cells in AquaSense_Analysis.ipynb using the nbconvert Python API
    (no 'jupyter' command needed) and save all outputs back into the same file.
    The lecturer opens the file and sees every chart and table already rendered.
    """
    banner("Executing notebook — saving all charts & tables into .ipynb")
    _ensure_nbconvert()

    import nbformat
    from nbconvert.preprocessors import ExecutePreprocessor, CellExecutionError

    nb_path = os.path.join(HERE, "AquaSense_Analysis.ipynb")
    t0 = time.time()

    print(f"  Reading  : {nb_path}")
    with open(nb_path, encoding="utf-8") as f:
        nb = nbformat.read(f, as_version=4)

    ep = ExecutePreprocessor(timeout=600, kernel_name="python3")
    try:
        print("  Running all cells (this takes a few minutes)...")
        ep.preprocess(nb, {"metadata": {"path": HERE}})
        print("  All cells executed successfully.")
    except CellExecutionError as e:
        print(f"\n  [WARN] A cell raised an error: {e.ename}: {e.evalue}")
        print("  Saving partial outputs anyway...")

    with open(nb_path, "w", encoding="utf-8") as f:
        nbformat.write(nb, f)

    elapsed = time.time() - t0
    print(f"\n  Notebook saved in {elapsed:.0f}s")
    print("  AquaSense_Analysis.ipynb now contains all fresh charts and tables.")

def open_jupyter():
    print("\n  Opening AquaSense_Analysis.ipynb in Jupyter Notebook...")
    launched = False
    for cmd in (
        [sys.executable, "-m", "jupyter", "notebook", "AquaSense_Analysis.ipynb"],
        [sys.executable, "-m", "notebook",             "AquaSense_Analysis.ipynb"],
    ):
        try:
            subprocess.Popen(cmd, cwd=HERE)
            print("  Jupyter started — check your browser.")
            launched = True
            break
        except FileNotFoundError:
            continue
    if not launched:
        print("  [INFO] Could not launch Jupyter automatically.")
        print("  The notebook is fully executed — open AquaSense_Analysis.ipynb")
        print("  in VS Code, JupyterLab, or any notebook viewer to see the results.")

# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    args = sys.argv[1:]
    no_jupyter = "--no-jupyter" in args
    watch_interval = None

    if "--watch" in args:
        idx = args.index("--watch")
        try:
            watch_interval = int(args[idx + 1])
        except (IndexError, ValueError):
            watch_interval = 120  # default: refresh every 2 minutes

    if watch_interval:
        print(f"\n  Watch mode: re-running pipeline every {watch_interval}s.")
        print("  Press Ctrl+C to stop.\n")
        run = 0
        while True:
            run += 1
            print(f"\n{'#'*62}")
            print(f"  Run #{run}  —  {time.strftime('%Y-%m-%d %H:%M:%S')}")
            print(f"{'#'*62}")
            run_pipeline()
            if not no_jupyter:
                execute_notebook()
            print(f"\n  Waiting {watch_interval}s for next refresh...")
            print("  (Press Ctrl+C to stop)")
            time.sleep(watch_interval)
    else:
        run_pipeline()
        if not no_jupyter:
            execute_notebook()
            open_jupyter()
