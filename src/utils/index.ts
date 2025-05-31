export function injectVars(template: string, values: any) {
	return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
		return key in values ? values[key] : `{{${key}}}`;
	});
}
