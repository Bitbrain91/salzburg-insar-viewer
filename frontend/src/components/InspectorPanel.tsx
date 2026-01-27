import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "../lib/store";
import { getBuildingDetail, getBuildingPoints, getPointDetail } from "../hooks/useApi";

export default function InspectorPanel() {
  const selection = useAppStore((state) => state.selection);

  const pointQuery = useQuery({
    queryKey: ["point-detail", selection],
    queryFn: () =>
      selection && selection.type === "point"
        ? getPointDetail(selection.code, selection.track)
        : Promise.resolve(null),
    enabled: selection?.type === "point",
  });

  const buildingDetailQuery = useQuery({
    queryKey: ["building-detail", selection],
    queryFn: () =>
      selection && selection.type === "building"
        ? getBuildingDetail(selection.source, selection.id)
        : Promise.resolve(null),
    enabled: selection?.type === "building",
  });

  const buildingPointsQuery = useQuery({
    queryKey: ["building-points", selection],
    queryFn: () =>
      selection && selection.type === "building"
        ? getBuildingPoints(selection.source, selection.id)
        : Promise.resolve(null),
    enabled: selection?.type === "building",
  });

  return (
    <div className="panel panel-right">
      <div>
        <h2>Inspector</h2>
        <small>Click a point or building to explore cross-source attributes.</small>
      </div>

      {!selection && <div className="pill">No selection yet</div>}

      {selection?.type === "point" && (
        <>
          {pointQuery.isLoading && <div className="pill">Loading point…</div>}
          {pointQuery.data && (
            <div>
              <div className="section-title">Point Details</div>
              <div className="metric">
                <span className="label">Code</span>
                <span className="value">{pointQuery.data.code}</span>
              </div>
              <div className="metric">
                <span className="label">Track / LOS</span>
                <span className="value">
                  {pointQuery.data.track} / {pointQuery.data.los}
                </span>
              </div>
              <div className="metric">
                <span className="label">Velocity (mm/yr)</span>
                <span className="value">{pointQuery.data.velocity?.toFixed(2)}</span>
              </div>
              <div className="metric">
                <span className="label">Coherence</span>
                <span className="value">{pointQuery.data.coherence?.toFixed(2)}</span>
              </div>
              <div className="metric">
                <span className="label">Height (m)</span>
                <span className="value">{pointQuery.data.height?.toFixed(1)}</span>
              </div>
              <div className="metric">
                <span className="label">Amplitude mean</span>
                <span className="value">{pointQuery.data.amp_mean?.toFixed(1)}</span>
              </div>
              <div className="metric">
                <span className="label">Linked GBA</span>
                <span className="value">{pointQuery.data.gba_id || "—"}</span>
              </div>
              <div className="metric">
                <span className="label">Linked OSM</span>
                <span className="value">{pointQuery.data.osm_id || "—"}</span>
              </div>
            </div>
          )}
        </>
      )}

      {selection?.type === "building" && (
        <>
          {buildingDetailQuery.isLoading && <div className="pill">Loading building…</div>}
          {buildingDetailQuery.data && (
            <div>
              <div className="section-title">Building Details</div>
              <div className="metric">
                <span className="label">Source</span>
                <span className="value">{buildingDetailQuery.data.source.toUpperCase()}</span>
              </div>
              <div className="metric">
                <span className="label">ID</span>
                <span className="value">{buildingDetailQuery.data.id}</span>
              </div>
              {buildingDetailQuery.data.height !== null && (
                <div className="metric">
                  <span className="label">Height (m)</span>
                  <span className="value">{buildingDetailQuery.data.height?.toFixed(1)}</span>
                </div>
              )}
              {buildingDetailQuery.data.name && (
                <div className="metric">
                  <span className="label">Name</span>
                  <span className="value">{buildingDetailQuery.data.name}</span>
                </div>
              )}
              {buildingDetailQuery.data.building_type && (
                <div className="metric">
                  <span className="label">Type</span>
                  <span className="value">{buildingDetailQuery.data.building_type}</span>
                </div>
              )}
              {buildingDetailQuery.data.attributes &&
                Object.keys(buildingDetailQuery.data.attributes).length > 0 && (
                  <div>
                    <div className="section-title">All Attributes</div>
                    {Object.entries(buildingDetailQuery.data.attributes).map(
                      ([key, value]) => (
                        <div className="metric" key={key}>
                          <span className="label">{key}</span>
                          <span className="value">
                            {typeof value === "object" ? JSON.stringify(value) : String(value)}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                )}
            </div>
          )}

          {buildingPointsQuery.data && (
            <div>
              <div className="section-title">Linked InSAR Points</div>
              <div className="metric">
                <span className="label">Count</span>
                <span className="value">{buildingPointsQuery.data.count}</span>
              </div>
              <div className="pill">{buildingPointsQuery.data.count} points linked</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
