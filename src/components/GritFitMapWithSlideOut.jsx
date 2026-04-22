/**
 * GritFitMapWithSlideOut — Sprint 004 Wave 3 G5.
 *
 * Thin wrapper around <GritFitMapView> that replaces the legacy Leaflet popup
 * with an SC-3 <SlideOutShell> containing an SC-4 <SchoolDetailsCard>. Per
 * operator ruling A-3, the school-detail interaction is a slide-out (not a
 * popover). Per ruling R-2, SchoolDetailsCard excludes financial fields
 * (COA / ANC / DROI / Fastest Payback) — no additive extension in this wave.
 *
 * Props: forwards every prop accepted by <GritFitMapView> (schools, topTier,
 *        recruitReach, shortListUnitids, gritFitUnitIds, shortlistIds,
 *        onAddToShortlist, ...) plus it manages its own selectedSchool state
 *        internally. Pass-through is by spread so this wrapper is drop-in
 *        compatible with any existing GritFitMapView usage.
 *
 * Status derivation: calls computeGritFitStatuses(selectedSchool, topTier,
 * recruitReach). The returned array is sorted by LABEL_PRIORITY in gritFitStatus.js
 * so the first element is the highest-priority label. That first element is
 * passed to SchoolDetailsCard as statusKey. An empty array yields null
 * statusKey -> SchoolDetailsCard renders no pill (A-2 compliant).
 */
import { useCallback, useState } from 'react';
import GritFitMapView from './GritFitMapView.jsx';
import SlideOutShell from './SlideOutShell.jsx';
import SchoolDetailsCard from './SchoolDetailsCard.jsx';
import { computeGritFitStatuses } from '../lib/gritFitStatus.js';

export default function GritFitMapWithSlideOut(props) {
  const { topTier, recruitReach } = props;
  const [selectedSchool, setSelectedSchool] = useState(null);

  const handleMarkerClick = useCallback((school) => {
    setSelectedSchool(school);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedSchool(null);
  }, []);

  // Derive the highest-priority status key for the selected school. The
  // returned array is already sorted by LABEL_PRIORITY; the first key is the
  // top priority. Empty array -> null (no pill, per A-2).
  let statusKey = null;
  if (selectedSchool) {
    const labels = computeGritFitStatuses(selectedSchool, topTier, recruitReach);
    statusKey = labels.length > 0 ? labels[0] : null;
  }

  return (
    <>
      <GritFitMapView {...props} onSchoolMarkerClick={handleMarkerClick} />
      <SlideOutShell
        isOpen={!!selectedSchool}
        onClose={handleClose}
        ariaLabel="School details"
      >
        <SchoolDetailsCard school={selectedSchool} statusKey={statusKey} />
      </SlideOutShell>
    </>
  );
}
