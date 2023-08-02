import { PageContainer } from "components";
import { useLayoutEffect } from "react";

export const ContactPage = ({
    business,
}) => {
    useLayoutEffect(() => {
        document.title = `Contact | ${business?.BUSINESS_NAME?.Short}`;
    });
    return (
        <PageContainer>
            {/* TODO */}
        </PageContainer>
    );
};
