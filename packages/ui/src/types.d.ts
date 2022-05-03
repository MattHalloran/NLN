// Top-level props that can be passed into any routed component
export type SessionChecked = boolean;
export type Session = {
    id?: string | null;
    roles?: any
    theme?: string;
    cart?: any;
    firstName?: string | null;
    lastName?: string | null;
    fullName?: string | null;
    pronouns?: string | null;
}
export interface CommonProps {
    session: Session;
    sessionChecked: SessionChecked;
}