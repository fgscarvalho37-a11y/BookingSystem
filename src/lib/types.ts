export type Tenant = {
 id:string;slug:string;name:string;tagline:string;description:string;accent:string;
 hero_image:string;timezone:string;opens_at:string;closes_at:string;weekdays:number[];
 orbitta_product_id:number|null;trial_until:string|null;theme_html:string|null;
 theme_css:string|null;theme_js:string|null;theme_zip_name:string|null;
 theme_draft_html:string|null;theme_draft_css:string|null;theme_draft_js:string|null;theme_draft_zip_name:string|null;theme_preset:'classic'|'minimal'|'bold';published:boolean;
};
export type Service = {id:string;tenant_id:string;name:string;description:string;price_cents:number;duration_min:number;enabled:boolean};
export type Appointment = {id:string;tenant_id:string;service_id:string;customer_name:string;customer_email:string;customer_phone:string;start_at:string;end_at:string;status:string;name?:string};
export type PublicTenant = Pick<Tenant,'slug'|'name'|'tagline'|'description'|'accent'|'hero_image'|'timezone'|'opens_at'|'closes_at'|'weekdays'|'theme_preset'> & {customTheme:boolean};
export type Slot = {start:string;label:string};
