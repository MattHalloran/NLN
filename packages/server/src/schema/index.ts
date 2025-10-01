import { makeExecutableSchema } from "@graphql-tools/schema";
import pkg from "lodash";
import * as Address from "./address.js";
import * as Business from "./business.js";
import * as Customer from "./customer.js";
import * as Discount from "./discount.js";
import * as Email from "./email.js";
import * as Feedback from "./feedback.js";
import * as Image from "./image.js";
import * as LandingPageContent from "./landingPageContent.js";
import * as Order from "./order.js";
import * as OrderItem from "./orderItem.js";
import * as Phone from "./phone.js";
import * as Plant from "./plant.js";
import * as PlantTrait from "./plantTrait.js";
import * as Role from "./role.js";
import * as Root from "./root.js";
import * as SeasonalContent from "./seasonalContent.js";
import * as Sku from "./sku.js";
import * as Task from "./task.js";

const { merge } = pkg;

const models = [
    Root,
    Address,
    Business,
    Customer,
    Discount,
    Email,
    Feedback,
    Image,
    LandingPageContent,
    Order,
    OrderItem,
    Phone,
    Plant,
    PlantTrait,
    Role,
    SeasonalContent,
    Sku,
    Task,
];

export const schema = makeExecutableSchema({
    typeDefs: models.map((m) => m.typeDef),
    resolvers: merge(models.map((m) => m.resolvers)),
});
