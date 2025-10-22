import { PageContainer } from "components";
import { BusinessContext } from "contexts/BusinessContext";
import { useContext, useLayoutEffect } from "react";

export const ContactPage = () => {
    const business = useContext(BusinessContext);

    useLayoutEffect(() => {
        document.title = `Contact | ${business?.BUSINESS_NAME?.Short}`;
    });
    return (
        <PageContainer>
            {/* Placeholder page - contact functionality is in AdminContactPage */}
        </PageContainer>
    );
};
