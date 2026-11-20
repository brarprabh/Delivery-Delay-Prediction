"""
DeliverIQ Architecture Diagrams Generator
Generates three high-resolution (300 DPI) publication-grade architecture diagrams
using matplotlib.patches, adhering to DeliverIQ's brand theme:
- Primary Teal: #0F766E
- Secondary Teal Accent: #14B8A6
- Dark Slate: #111827
- Light Slate Fill: #F7F8FA
- Clean crisp white background, clear directional arrows, bold typography.

Outputs in report_figures/:
1. fig1_workflow.png: Reactive ERP vs. DeliverIQ Proactive Workflow
2. fig3_pipeline.png: 11-Stage Leak-Free Preprocessing Pipeline with Strict Isolation
3. fig4_cascade.png: Tier-Specific Cascade Classifier & Full-Stack Inference Architecture
"""

import os
import matplotlib.pyplot as plt
import matplotlib.patches as patches

# Directory
OUTPUT_DIR = "report_figures"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Color Palette
PRIMARY_TEAL = "#0F766E"
SECONDARY_TEAL = "#14B8A6"
DARK_SLATE = "#111827"
LIGHT_BG = "#F7F8FA"
WHITE = "#FFFFFF"
BORDER_GREY = "#E5E7EB"
ALERT_RED = "#EF4444"
ALERT_BG = "#FEF2F2"
ONTIME_GREEN = "#10B981"
ONTIME_BG = "#ECFDF5"
TEXT_MUTED = "#64748B"
TEXT_DARK = "#172033"

# Global font styling
plt.rcParams.update({
    "font.sans-serif": ["Segoe UI", "DejaVu Sans", "Arial", "Helvetica"],
    "font.family": "sans-serif",
    "figure.facecolor": WHITE,
    "axes.facecolor": WHITE,
})


def draw_box(ax, x, y, width, height, title, subtitle="",
             box_color=WHITE, edge_color=BORDER_GREY, title_color=TEXT_DARK,
             subtitle_color=TEXT_MUTED, title_fontsize=10, sub_fontsize=8.5,
             lw=1.5, radius=0.015, zorder=3):
    """Draws a rounded card box with two-line title/subtitle text."""
    box = patches.FancyBboxPatch(
        (x, y), width, height,
        boxstyle=f"round,pad=0,rounding_size={radius}",
        facecolor=box_color, edgecolor=edge_color,
        linewidth=lw, zorder=zorder
    )
    ax.add_patch(box)

    if subtitle:
        ax.text(x + width / 2, y + height * 0.60, title,
                ha="center", va="center", fontsize=title_fontsize, fontweight="bold",
                color=title_color, zorder=zorder + 1)
        ax.text(x + width / 2, y + height * 0.28, subtitle,
                ha="center", va="center", fontsize=sub_fontsize, fontweight="semibold",
                color=subtitle_color, zorder=zorder + 1)
    else:
        ax.text(x + width / 2, y + height / 2, title,
                ha="center", va="center", fontsize=title_fontsize, fontweight="bold",
                color=title_color, zorder=zorder + 1)
    return box


def draw_arrow(ax, x1, y1, x2, y2, color=TEXT_MUTED, lw=2.0, style="-|>", zorder=2):
    """Draws a crisp directional arrow."""
    ax.annotate(
        "", xy=(x2, y2), xytext=(x1, y1),
        arrowprops=dict(
            arrowstyle=style, color=color, lw=lw,
            shrinkA=0, shrinkB=0,
            mutation_scale=14
        ),
        zorder=zorder
    )


# ==============================================================================
# DIAGRAM 1: fig1_workflow.png (Reactive vs. Proactive Workflow)
# ==============================================================================
def generate_fig1():
    fig, ax = plt.subplots(figsize=(16, 8.2), dpi=300)
    ax.set_xlim(0, 16)
    ax.set_ylim(0, 8.5)
    ax.axis("off")

    # Title
    ax.text(8.0, 8.0, "Operational Logistics Workflow: Reactive ERP vs. DeliverIQ Proactive ML",
            ha="center", va="center", fontsize=15, fontweight="bold", color=DARK_SLATE)
    ax.text(8.0, 7.6, "Comparison of conventional post-incident resolution vs. pre-dispatch probabilistic mitigation",
            ha="center", va="center", fontsize=10.5, color=TEXT_MUTED)

    # ── Track 1: Conventional Reactive ERP (Top) ──
    # Track background banner
    track1_bg = patches.FancyBboxPatch((0.5, 4.4), 15.0, 2.6, boxstyle="round,pad=0,rounding_size=0.02",
                                       facecolor="#FDF2F2", edgecolor="#FECACA", lw=1.2, zorder=1)
    ax.add_patch(track1_bg)
    ax.text(0.8, 6.6, "CONVENTIONAL LOGISTICS: REACTIVE ERP TRACK (FAILURE-PRONE)",
            fontsize=10, fontweight="bold", color=ALERT_RED)

    # Track 1 Boxes
    w1, h1 = 2.4, 1.2
    y1 = 4.9

    # Step 1
    draw_box(ax, 1.0, y1, w1, h1, "1. Order Placed", "Commercial checkout", WHITE, "#FECACA", TEXT_DARK, TEXT_MUTED)
    # Step 2
    draw_box(ax, 4.5, y1, w1, h1, "2. Blind Dispatch", "Standard warehouse ship", WHITE, "#FECACA", TEXT_DARK, TEXT_MUTED)
    # Step 3
    draw_box(ax, 8.0, y1, w1, h1, "3. Transit Delay", "Severe weather / bottleneck", ALERT_BG, ALERT_RED, ALERT_RED, "#991B1B")
    # Step 4
    draw_box(ax, 11.5, y1, w1, h1, "4. SLA Breach Logged", "Customer churn & penalty fee", ALERT_BG, ALERT_RED, ALERT_RED, "#991B1B")

    # Track 1 Arrows
    draw_arrow(ax, 1.0 + w1, y1 + h1 / 2, 4.5, y1 + h1 / 2, color="#F87171", lw=2.2)
    draw_arrow(ax, 4.5 + w1, y1 + h1 / 2, 8.0, y1 + h1 / 2, color="#F87171", lw=2.2)
    draw_arrow(ax, 8.0 + w1, y1 + h1 / 2, 11.5, y1 + h1 / 2, color=ALERT_RED, lw=2.2)

    # ── Track 2: DeliverIQ Proactive Pipeline (Bottom) ──
    # Track background banner
    track2_bg = patches.FancyBboxPatch((0.5, 0.6), 15.0, 3.4, boxstyle="round,pad=0,rounding_size=0.02",
                                       facecolor="#F0FDF4", edgecolor="#BBF7D0", lw=1.2, zorder=1)
    ax.add_patch(track2_bg)
    ax.text(0.8, 3.65, "DELIVERIQ PLATFORM: PRE-DISPATCH PROACTIVE INTELLIGENCE TRACK",
            fontsize=10, fontweight="bold", color=PRIMARY_TEAL)

    # Track 2 Boxes
    w2, h2 = 2.3, 1.3
    y2 = 1.6

    # Step 1
    draw_box(ax, 1.0, y2, w2, h2, "1. Order Placed", "Payload sent to API", WHITE, "#A7F3D0", TEXT_DARK, TEXT_MUTED)
    # Step 2: Risk Engine
    draw_box(ax, 4.0, y2, w2, h2, "2. Risk Engine", "Inference in < 35ms", LIGHT_BG, PRIMARY_TEAL, PRIMARY_TEAL, DARK_SLATE, lw=2)
    # Step 3: Confidence Gate
    draw_box(ax, 7.0, y2, w2, h2, "3. Confidence Gate", "Margin ±0.10 (At-Risk band)", LIGHT_BG, PRIMARY_TEAL, PRIMARY_TEAL, DARK_SLATE, lw=2)

    # Split decisions: Confident vs Reroute
    w_sub, h_sub = 2.4, 0.95
    # Option A: Confident Dispatch (Upper branch)
    draw_box(ax, 10.1, 2.3, w_sub, h_sub, "Confident Dispatch", "Automated carrier label", ONTIME_BG, ONTIME_GREEN, ONTIME_GREEN, "#065F46", title_fontsize=9.5)
    # Option B: Human Reroute (Lower branch)
    draw_box(ax, 10.1, 0.9, w_sub, h_sub, "Dispatcher Reroute", "Proactive buffer / carrier swap", "#FEF3C7", "#F59E0B", "#92400E", "#78350F", title_fontsize=9.5)

    # Final Outcome: SLA Protected
    draw_box(ax, 13.2, y2, 2.0, h2, "SLA Protected", "Zero Penalty Fee", PRIMARY_TEAL, DARK_SLATE, WHITE, "#CCFBF1", lw=2, title_fontsize=11)

    # Track 2 Arrows
    draw_arrow(ax, 1.0 + w2, y2 + h2 / 2, 4.0, y2 + h2 / 2, color=PRIMARY_TEAL, lw=2.4)
    draw_arrow(ax, 4.0 + w2, y2 + h2 / 2, 7.0, y2 + h2 / 2, color=PRIMARY_TEAL, lw=2.4)

    # Fork arrows from Confidence Gate
    draw_arrow(ax, 7.0 + w2, y2 + h2 * 0.70, 10.1, 2.3 + h_sub / 2, color=ONTIME_GREEN, lw=2.0)
    draw_arrow(ax, 7.0 + w2, y2 + h2 * 0.30, 10.1, 0.9 + h_sub / 2, color="#D97706", lw=2.0)

    # Convergence arrows to SLA Protected
    draw_arrow(ax, 10.1 + w_sub, 2.3 + h_sub / 2, 13.2, y2 + h2 * 0.70, color=PRIMARY_TEAL, lw=2.0)
    draw_arrow(ax, 10.1 + w_sub, 0.9 + h_sub / 2, 13.2, y2 + h2 * 0.30, color=PRIMARY_TEAL, lw=2.0)

    plt.tight_layout()
    path = os.path.join(OUTPUT_DIR, "fig1_workflow.png")
    plt.savefig(path, dpi=300, bbox_inches="tight")
    plt.close()
    print(f"✅ Generated: {path}")


# ==============================================================================
# DIAGRAM 2: fig3_pipeline.png (11-Stage Leak-Free Preprocessing Pipeline)
# ==============================================================================
def generate_fig3():
    fig, ax = plt.subplots(figsize=(16, 9.0), dpi=300)
    ax.set_xlim(0, 16)
    ax.set_ylim(0, 9.5)
    ax.axis("off")

    # Header
    ax.text(8.0, 9.0, "DeliverIQ 11-Stage Leak-Free Preprocessing Pipeline",
            ha="center", va="center", fontsize=15, fontweight="bold", color=DARK_SLATE)
    ax.text(8.0, 8.6, "Ensuring complete isolation between training distribution statistics and online inference transformations",
            ha="center", va="center", fontsize=10.5, color=TEXT_MUTED)

    # Top Section Label: Row 1
    ax.text(0.8, 7.8, "ROW 1: DATA INGESTION, LEAKAGE REMOVAL & STRATIFIED SPLIT",
            fontsize=10.5, fontweight="bold", color=DARK_SLATE)

    # Row 1 Boxes
    y_r1 = 6.2
    w_r1, h_r1 = 3.2, 1.25

    draw_box(ax, 0.8, y_r1, w_r1, h_r1, "1. Raw Data Ingestion", "180,519 rows × 60 features", LIGHT_BG, BORDER_GREY)
    draw_box(ax, 4.6, y_r1, w_r1, h_r1, "2. Drop Leakage Cols", "Remove 7 post-order groups", LIGHT_BG, ALERT_RED, title_color=ALERT_RED)
    draw_box(ax, 8.4, y_r1, w_r1, h_r1, "3. Domain Feature Eng.", "Cyclic time, ratios, priorities", LIGHT_BG, PRIMARY_TEAL)
    draw_box(ax, 12.2, y_r1, 3.0, h_r1, "4. Stratified 80/20 Split", "Train (144k) | Test (36k)", "#FEF3C7", "#D97706", title_color="#92400E", lw=2)

    # Row 1 Arrows
    draw_arrow(ax, 0.8 + w_r1, y_r1 + h_r1 / 2, 4.6, y_r1 + h_r1 / 2, color=DARK_SLATE)
    draw_arrow(ax, 4.6 + w_r1, y_r1 + h_r1 / 2, 8.4, y_r1 + h_r1 / 2, color=DARK_SLATE)
    draw_arrow(ax, 8.4 + w_r1, y_r1 + h_r1 / 2, 12.2, y_r1 + h_r1 / 2, color=DARK_SLATE)

    # ── Strict Train/Test Divider ──
    ax.plot([0.5, 15.5], [5.3, 5.3], color=ALERT_RED, linestyle="--", linewidth=2.0, zorder=2)
    ax.text(8.0, 5.3, "  STRICT TRAIN/TEST ISOLATION BARRIER (ALL STATISTICS FIT ON TRAIN ONLY)  ",
            ha="center", va="center", fontsize=9.5, fontweight="bold", color=ALERT_RED,
            bbox=dict(facecolor=WHITE, edgecolor=ALERT_RED, boxstyle="round,pad=0.35", lw=1.5), zorder=4)

    # Connector line from Split to Row 2
    ax.annotate("", xy=(1.8, 4.1), xytext=(13.7, y_r1),
                arrowprops=dict(arrowstyle="->", color=PRIMARY_TEAL, lw=2.2, connectionstyle="angle,angleA=-90,angleB=180,rad=10"), zorder=2)

    # Bottom Section Label: Row 2
    ax.text(0.8, 4.6, "ROW 2: FIT ON TRAIN ONLY → SERIALIZED TO pipeline_metadata.joblib (ONLINE REUSABLE)",
            fontsize=10.5, fontweight="bold", color=PRIMARY_TEAL)

    # Row 2 Boxes (7 transformations)
    w_r2, h_r2 = 1.9, 1.25
    y_r2 = 2.4
    r2_xs = [0.8, 3.0, 5.2, 7.4, 9.6, 11.8, 13.9]

    draw_box(ax, r2_xs[0], y_r2, w_r2, h_r2, "5. Imputation", "Mean / Mode fit", LIGHT_BG, BORDER_GREY, title_fontsize=9)
    draw_box(ax, r2_xs[1], y_r2, w_r2, h_r2, "6. IQR Capping", "Whiskers [Q1, Q3]", LIGHT_BG, BORDER_GREY, title_fontsize=9)
    draw_box(ax, r2_xs[2], y_r2, w_r2, h_r2, "7. Geo Centroid", "dist_center (median)", LIGHT_BG, BORDER_GREY, title_fontsize=9)
    draw_box(ax, r2_xs[3], y_r2, w_r2, h_r2, "8. Skew Log1p", "For |skew| > 0.5", LIGHT_BG, BORDER_GREY, title_fontsize=9)
    draw_box(ax, r2_xs[4], y_r2, w_r2, h_r2, "9. Encoders", "OHE + Target (s=10)", LIGHT_BG, BORDER_GREY, title_fontsize=9)
    draw_box(ax, r2_xs[5], y_r2, w_r2, h_r2, "10. MinMax Scale", "Interval [0, 1]", LIGHT_BG, BORDER_GREY, title_fontsize=9)
    draw_box(ax, r2_xs[6], y_r2, w_r2, h_r2, "11. Top-30 MI", "Mutual Info Filter", ONTIME_BG, ONTIME_GREEN, title_color=ONTIME_GREEN, lw=2, title_fontsize=9)

    # Row 2 connecting arrows
    for i in range(len(r2_xs) - 1):
        draw_arrow(ax, r2_xs[i] + w_r2, y_r2 + h_r2 / 2, r2_xs[i + 1], y_r2 + h_r2 / 2, color=PRIMARY_TEAL, lw=1.8)

    # Output artifact footer badge
    artifact_box = patches.FancyBboxPatch((4.0, 0.7), 8.0, 0.9, boxstyle="round,pad=0,rounding_size=0.015",
                                          facecolor=DARK_SLATE, edgecolor=DARK_SLATE, zorder=3)
    ax.add_patch(artifact_box)
    ax.text(8.0, 1.15, "PRODUCED ARTIFACTS: pipeline_metadata.joblib  •  scaler.joblib  •  target_encoder.joblib",
            ha="center", va="center", fontsize=9.5, fontweight="bold", color=WHITE, zorder=4)

    draw_arrow(ax, r2_xs[6] + w_r2 / 2, y_r2, 11.5, 1.6, color=DARK_SLATE, lw=2.0)

    plt.tight_layout()
    path = os.path.join(OUTPUT_DIR, "fig3_pipeline.png")
    plt.savefig(path, dpi=300, bbox_inches="tight")
    plt.close()
    print(f"✅ Generated: {path}")


# ==============================================================================
# DIAGRAM 3: fig4_cascade.png (Cascade Architecture & Full-Stack Flow)
# ==============================================================================
def generate_fig4():
    fig, ax = plt.subplots(figsize=(16, 9.2), dpi=300)
    ax.set_xlim(0, 16)
    ax.set_ylim(0, 9.5)
    ax.axis("off")

    # Title
    ax.text(8.0, 9.0, "DeliverIQ Tier-Specific Cascade Classifier & Full-Stack Inference Flow",
            ha="center", va="center", fontsize=15, fontweight="bold", color=DARK_SLATE)
    ax.text(8.0, 8.6, "Online inference architecture routing 30-feature vectors by carrier tier to specialized estimators",
            ha="center", va="center", fontsize=10.5, color=TEXT_MUTED)

    # 1. Input Vector Box (Left)
    draw_box(ax, 0.6, 3.8, 2.4, 2.0, "30-Feature\nScaled Vector", "MinMax Normalized\n[0, 1] Domain",
             LIGHT_BG, PRIMARY_TEAL, PRIMARY_TEAL, TEXT_MUTED, title_fontsize=11, lw=2)

    # 2. Branching Tier Estimators (Middle Column)
    tier_y = [6.6, 4.8, 3.0, 1.2]
    tier_info = [
        ("Standard Class (59.7% Vol)", "LightGBM (is_unbalance=True, θ=0.50)", PRIMARY_TEAL),
        ("Second Class (19.5% Vol)", "XGBoost (scale_pos_weight=3.28)", PRIMARY_TEAL),
        ("First Class (15.4% Vol)", "Logistic Regression (SAGA Solver, L2)", PRIMARY_TEAL),
        ("Same Day (5.4% Vol)", "Shallow GBM (depth=3, n_est=100)", PRIMARY_TEAL)
    ]

    w_tier, h_tier = 4.2, 1.3
    x_tier = 4.3

    for y, (title, sub, col) in zip(tier_y, tier_info):
        draw_box(ax, x_tier, y, w_tier, h_tier, title, sub, WHITE, col, DARK_SLATE, TEXT_MUTED, title_fontsize=10.5, sub_fontsize=9, lw=1.6)
        # Fork arrows from Input Vector
        draw_arrow(ax, 3.0, 4.8, x_tier, y + h_tier / 2, color=PRIMARY_TEAL, lw=1.8)

    # 3. Decision & Explainability Converters (Right Column 1)
    x_conv = 9.8
    draw_box(ax, x_conv, 4.8, 2.6, 1.5, "Confidence Gate", "Margin θ ± 0.10\n[0.40, 0.60) At-Risk Band",
             "#FEF3C7", "#D97706", "#92400E", "#78350F", lw=2, title_fontsize=10.5)

    draw_box(ax, x_conv, 2.8, 2.6, 1.5, "Directional Attribution", "Top-6 Feature Drivers\n(+Risk vs -Risk)",
             LIGHT_BG, SECONDARY_TEAL, PRIMARY_TEAL, TEXT_MUTED, lw=1.8, title_fontsize=10)

    # Convergence arrows from 4 tiers to Confidence Gate & Drivers
    for y in tier_y:
        draw_arrow(ax, x_tier + w_tier, y + h_tier / 2, x_conv, 5.5, color=DARK_SLATE, lw=1.5)
        draw_arrow(ax, x_tier + w_tier, y + h_tier / 2, x_conv, 3.5, color=SECONDARY_TEAL, lw=1.2)

    # 4. Serving & Presentation Layer (Rightmost Column)
    x_serve = 13.3
    draw_box(ax, x_serve, 5.0, 2.2, 1.6, "FastAPI Backend", "Uvicorn ASGI (<35ms)\nSingleton in RAM",
             LIGHT_BG, DARK_SLATE, DARK_SLATE, TEXT_MUTED, lw=1.8, title_fontsize=10.5)

    draw_box(ax, x_serve, 3.0, 2.2, 1.4, "SQLite Store", "SQLAlchemy Audit\nHistory Logging",
             LIGHT_BG, DARK_SLATE, DARK_SLATE, TEXT_MUTED, lw=1.8, title_fontsize=10)

    draw_box(ax, x_serve, 1.0, 2.2, 1.4, "React 19 Dashboard", "Recharts Analytics\nInteractive UI",
             PRIMARY_TEAL, DARK_SLATE, WHITE, "#CCFBF1", lw=2, title_fontsize=10.5)

    # Arrows to serving stack
    draw_arrow(ax, x_conv + 2.6, 5.5, x_serve, 5.8, color=DARK_SLATE, lw=2.0)
    draw_arrow(ax, x_conv + 2.6, 3.5, x_serve, 3.7, color=DARK_SLATE, lw=1.8)
    draw_arrow(ax, x_serve + 1.1, 5.0, x_serve + 1.1, 4.4, color=DARK_SLATE, lw=1.8)
    draw_arrow(ax, x_serve + 1.1, 3.0, x_serve + 1.1, 2.4, color=PRIMARY_TEAL, lw=2.0)

    plt.tight_layout()
    path = os.path.join(OUTPUT_DIR, "fig4_cascade.png")
    plt.savefig(path, dpi=300, bbox_inches="tight")
    plt.close()
    print(f"✅ Generated: {path}")


if __name__ == "__main__":
    print("🎨 Generating DeliverIQ publication architecture diagrams (300 DPI)...")
    generate_fig1()
    generate_fig3()
    generate_fig4()
    print("✨ All architecture diagrams successfully generated in report_figures/!")
