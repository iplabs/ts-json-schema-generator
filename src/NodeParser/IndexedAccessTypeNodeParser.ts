import * as ts from "typescript";
import { LogicError } from "../Error/LogicError";
import { Context, NodeParser } from "../NodeParser";
import { SubNodeParser } from "../SubNodeParser";
import { BaseType } from "../Type/BaseType";
import { LiteralType } from "../Type/LiteralType";
import { StringType } from "../Type/StringType";
import { getTypeByKey } from "../Utils/typeKeys";

export class IndexedAccessTypeNodeParser implements SubNodeParser {
    public constructor(
        private childNodeParser: NodeParser,
    ) {
    }

    public supportsNode(node: ts.IndexedAccessTypeNode): boolean {
        return node.kind === ts.SyntaxKind.IndexedAccessType;
    }
    public createType(node: ts.IndexedAccessTypeNode, context: Context): BaseType {
        const indexType = this.childNodeParser.createType(node.indexType, context);
        if (!(indexType instanceof LiteralType || indexType instanceof StringType)) {
            throw new LogicError(`Unexpected type "${indexType.getId()}" (expected "LiteralType" or "StringType")`);
        }

        const objectType = this.childNodeParser.createType(node.objectType, context);
        const propertyType = getTypeByKey(objectType, indexType);
        if (!propertyType) {
            if (indexType instanceof LiteralType) {
                throw new LogicError(`Invalid index "${indexType.getValue()}" in type "${objectType.getId()}"`);
            } else {
                throw new LogicError(`No additional properties in type "${objectType.getId()}"`);
            }
        }

        return propertyType;
    }
}
