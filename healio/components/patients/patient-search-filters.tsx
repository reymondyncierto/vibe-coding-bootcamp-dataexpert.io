"use client";

import { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type PatientSearchFiltersProps = {
  searchValue: string;
  onSearchValueChange: (value: string) => void;
  pageSize: number;
  onPageSizeChange: (value: number) => void;
  isRefreshing?: boolean;
  onRefresh: () => void;
  onReset: () => void;
};

export function PatientSearchFilters({
  searchValue,
  onSearchValueChange,
  pageSize,
  onPageSizeChange,
  isRefreshing = false,
  onRefresh,
  onReset,
}: PatientSearchFiltersProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onRefresh();
  }

  return (
    <form className="grid gap-3 lg:grid-cols-[1.4fr_auto_auto_auto]" onSubmit={handleSubmit}>
      <label className="grid gap-1 text-sm">
        <span className="healio-label">Search patients</span>
        <Input
          type="search"
          name="patientSearch"
          value={searchValue}
          onChange={(event) => onSearchValueChange(event.target.value)}
          placeholder="Name, phone, or email"
          aria-label="Search patients"
        />
      </label>

      <label className="grid gap-1 text-sm">
        <span className="healio-label">Rows</span>
        <Select
          name="patientPageSize"
          value={String(pageSize)}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          aria-label="Patients per page"
        >
          <option value="10">10</option>
          <option value="20">20</option>
          <option value="50">50</option>
        </Select>
      </label>

      <Button type="submit" variant="secondary" loading={isRefreshing}>
        Refresh
      </Button>
      <Button type="button" variant="ghost" onClick={onReset}>
        Reset
      </Button>
    </form>
  );
}
