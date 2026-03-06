export default function Input({
  id,
  label,
  helper,
  error,
  className = "",
  inputClassName = "",
  ...props
}) {
  return (
    <label className={`ui-input ${className}`.trim()} htmlFor={id}>
      {label ? <span className="ui-input__label">{label}</span> : null}
      <input id={id} className={`ui-input__control ${inputClassName}`.trim()} {...props} />
      {error ? <span className="ui-input__meta ui-input__meta--error">{error}</span> : null}
      {!error && helper ? <span className="ui-input__meta">{helper}</span> : null}
    </label>
  );
}
