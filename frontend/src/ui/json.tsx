type JsonValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | JsonValue[]
  | { [key: string]: JsonValue };

export const Json = ({ json }: { json: JsonValue }) => {
  if (!json) {
    return <p>null</p>;
  }

  const type = typeof json;

  // null case
  if (type === "undefined") {
    return <p>null</p>;
  }

  if (type === "function") {
    return <p>??function??</p>;
  }

  // base cases
  if (
    type === "bigint" ||
    type === "boolean" ||
    type === "number" ||
    type === "string" ||
    type === "symbol"
  ) {
    return <p>{String(json)}</p>;
  }

  // Type is object or array
  if (Array.isArray(json)) {
    return (
      <div className="flex flex-col gap-2">
        {json.map((json, index) => (
          <Json key={index} json={json} />
        ))}
      </div>
    );
  }

  if (type === "object") {
    const obj = json as {
      [key: string]: JsonValue;
    };
    return (
      <div className="flex flex-col gap-2">
        {Object.keys(obj).map((key) => (
          <div key={key} className="flex gap-2">
            <p>{key}</p>: <Json json={obj[key]} />
          </div>
        ))}
      </div>
    );
  }

  return <p>null</p>;
};
