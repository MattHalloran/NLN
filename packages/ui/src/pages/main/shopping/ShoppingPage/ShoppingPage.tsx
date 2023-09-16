import { useQuery } from "@apollo/client";
import { Button, FormControlLabel, Stack, Switch } from "@mui/material";
import { traitOptions } from "api/generated/traitOptions";
import { traitOptionsQuery } from "api/query";
import { PageContainer } from "components";
import { BusinessContext } from "components/contexts/BusinessContext";
import { SessionContext } from "components/contexts/SessionContext";
import { FilterIcon, PrintIcon } from "icons";
import { useCallback, useContext, useEffect, useState } from "react";
import { PubSub, SORT_OPTIONS, printAvailability } from "utils";
import { ShoppingFilterSideMenu } from "../ShoppingFilterSideMenu/ShoppingFilterSideMenu";
import { ShoppingList } from "../ShoppingList/ShoppingList";

export const ShoppingPage = () => {
    const session = useContext(SessionContext);
    const business = useContext(BusinessContext);

    const { data: traitOptionsData } = useQuery<traitOptions>(traitOptionsQuery);
    const [traitOptions, setTraitOptions] = useState<{ [key: string]: string[] }>({});
    const [filters, setFilters] = useState<{ [x: string]: string }>({});
    const [hideOutOfStock, setHideOutOfStock] = useState(false);
    const [searchString, setSearchString] = useState("");
    const [sortBy, setSortBy] = useState(SORT_OPTIONS[0]);

    useEffect(() => {
        const traitOptions: { [key: string]: string[] } = {};
        for (const option of traitOptionsData?.traitOptions ?? []) {
            traitOptions[option.name] = option.values;
        }
        setTraitOptions(traitOptions);
    }, [traitOptionsData]);

    const handleHideChange = useCallback((event) => {
        setHideOutOfStock(event.target.checked);
    }, []);

    return (
        <PageContainer sx={{ paddingLeft: "0!important", paddingRight: "0!important" }}>
            <ShoppingFilterSideMenu
                filters={filters}
                handleFiltersChange={setFilters}
                handleSearchChange={setSearchString}
                handleSortByChange={setSortBy}
                searchString={searchString}
                sortBy={sortBy}
                traitOptions={traitOptions}
            />
            <Stack direction="row" spacing={2} justifyContent="center" alignItems="center" mb={2}>
                <FormControlLabel
                    control={
                        <Switch
                            checked={hideOutOfStock}
                            onChange={handleHideChange}
                            color="secondary"
                        />
                    }
                    label="Hide out of stock"
                />
                <Button
                    color="secondary"
                    startIcon={<FilterIcon />}
                    onClick={() => PubSub.get().publishSideMenu({ id: "shopping-filter-side-menu", isOpen: true })}
                    variant="contained"
                >Filter</Button>
                <Button
                    color="secondary"
                    startIcon={<PrintIcon />}
                    onClick={() => printAvailability(session, business?.BUSINESS_NAME?.Long, business?.PHONE?.Label, business?.EMAIL?.Label)}
                    variant="contained"
                >Print</Button>
            </Stack>
            <ShoppingList
                sortBy={sortBy.value}
                filters={filters}
                searchString={searchString}
                hideOutOfStock={hideOutOfStock}
            />
        </PageContainer >
    );
};
