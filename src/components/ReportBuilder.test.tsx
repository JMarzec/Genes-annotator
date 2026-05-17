import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ReportBuilder from "@/components/ReportBuilder";
import { GeneDataProvider, useGeneData } from "@/contexts/GeneDataContext";
import type { GeneAnnotation } from "@/data/sampleData";
import { useEffect } from "react";

const makeGene = (symbol: string, role: GeneAnnotation["role"] = "Unknown"): GeneAnnotation => ({
  symbol,
  ensemblId: "—",
  entrezId: "—",
  role,
  description: `${symbol} description.`,
  cancerRelevance: "Unknown",
  civicEvidence: false,
  dgidbInteractions: false,
});

const Seed = ({ annotations }: { annotations: GeneAnnotation[] }) => {
  const { setAnnotations } = useGeneData();
  useEffect(() => {
    setAnnotations(annotations);
  }, [annotations, setAnnotations]);
  return null;
};

const renderWith = (annotations: GeneAnnotation[]) =>
  render(
    <GeneDataProvider>
      <Seed annotations={annotations} />
      <ReportBuilder />
    </GeneDataProvider>,
  );

describe("ReportBuilder selection is index-safe", () => {
  it("treats two rows with the same symbol as independently selectable", async () => {
    const user = userEvent.setup();
    // Two rows that — after a hypothetical canonicalization bug — could end up
    // sharing a symbol. Selection must still track them as distinct rows.
    renderWith([makeGene("PTPRC"), makeGene("PTPRC"), makeGene("TP53")]);

    // The first PTPRC checkbox is at index 1 in the rendered list (index 0 is "Select all").
    const checkboxes = await screen.findAllByRole("checkbox");
    // Click the first gene-row checkbox only.
    await user.click(checkboxes[1]);

    expect(screen.getByText("of 3 selected").textContent).toBeTruthy();
    // The counter shows "<n> of 3 selected" — verify 1 is selected, not 2.
    const selectedCount = screen.getByText("1").textContent;
    expect(selectedCount).toBe("1");

    // Now click the second PTPRC row — selection should become 2, proving
    // duplicate symbols don't share a key.
    await user.click(checkboxes[2]);
    expect(screen.getByText("2").textContent).toBe("2");
  });

  it("select-all toggles every row including duplicate symbols", async () => {
    const user = userEvent.setup();
    renderWith([makeGene("PTPRC"), makeGene("PTPRC"), makeGene("TP53")]);

    const selectAll = await screen.findByLabelText(/select all filtered genes/i);
    await user.click(selectAll);

    expect(screen.getByText("3").textContent).toBe("3");
  });

  it("filtering by search keeps selection of hidden duplicate rows intact", async () => {
    const user = userEvent.setup();
    renderWith([makeGene("PTPRC"), makeGene("PTPRC"), makeGene("TP53")]);

    const checkboxes = await screen.findAllByRole("checkbox");
    await user.click(checkboxes[1]); // first PTPRC
    await user.click(checkboxes[2]); // second PTPRC

    const filter = screen.getByPlaceholderText(/filter genes/i);
    await user.type(filter, "TP53");

    // Both PTPRC selections survive even though they are filtered out of the view.
    expect(screen.getByText("2").textContent).toBe("2");

    // The visible filtered list shows only TP53 — one unchecked row + the
    // select-all checkbox.
    const visibleCheckboxes = screen.getAllByRole("checkbox");
    expect(visibleCheckboxes).toHaveLength(2);
    const tp53Row = screen.getByText("TP53").closest("label")!;
    const tp53Checkbox = within(tp53Row).getByRole("checkbox");
    expect(tp53Checkbox).not.toBeChecked();
  });
});
