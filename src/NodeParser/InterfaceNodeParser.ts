import * as ts from "typescript";
import { Context, NodeParser } from "../NodeParser";
import { SubNodeParser } from "../SubNodeParser";
import { BaseType } from "../Type/BaseType";
import { ObjectProperty, ObjectType } from "../Type/ObjectType";
import { ReferenceType } from "../Type/ReferenceType";
import { isHidden } from "../Utils/isHidden";
import { getKey } from "../Utils/nodeKey";

export class InterfaceNodeParser implements SubNodeParser {
    public constructor(
        private typeChecker: ts.TypeChecker,
        private childNodeParser: NodeParser,
    ) {
    }

    public supportsNode(node: ts.InterfaceDeclaration): boolean {
        return node.kind === ts.SyntaxKind.InterfaceDeclaration;
    }

    public createType(node: ts.InterfaceDeclaration, context: Context, reference?: ReferenceType): BaseType {
        if (node.typeParameters && node.typeParameters.length) {
            node.typeParameters.forEach((typeParam) => {
                const nameSymbol = this.typeChecker.getSymbolAtLocation(typeParam.name)!;
                context.pushParameter(nameSymbol.name);

                if (typeParam.default) {
                    const type = this.childNodeParser.createType(typeParam.default, context);
                    context.setDefault(nameSymbol.name, type);
                }
            });
        }

        const id = this.getTypeId(node, context);
        if (reference) {
            reference.setId(id);
            reference.setName(id);
        }
        return new ObjectType(
            id,
            this.getBaseTypes(node, context),
            this.getProperties(node, context),
            this.getAdditionalProperties(node, context),
        );
    }

    private getBaseTypes(node: ts.InterfaceDeclaration, context: Context): BaseType[] {
        if (!node.heritageClauses) {
            return [];
        }

        return node.heritageClauses.reduce((result: BaseType[], baseType) => [
            ...result,
            ...baseType.types.map((expression) => this.childNodeParser.createType(expression, context)),
        ], []);
    }

    private getProperties(node: ts.InterfaceDeclaration, context: Context): ObjectProperty[] {
        return node.members
            .filter(ts.isPropertySignature)
            .reduce((result: ObjectProperty[], propertyNode) => {
                const propertySymbol: ts.Symbol = (propertyNode as any).symbol;
                if (isHidden(propertySymbol)) {
                    return result;
                }
                const objectProperty: ObjectProperty = new ObjectProperty(
                    propertySymbol.getName(),
                    this.childNodeParser.createType(propertyNode.type!, context),
                    !propertyNode.questionToken,
                );

                result.push(objectProperty);
                return result;
            }, []);
    }
    private getAdditionalProperties(node: ts.InterfaceDeclaration, context: Context): BaseType | false {
        const indexSignature = node.members.find(ts.isIndexSignatureDeclaration);
        if (!indexSignature) {
            return false;
        }

        return this.childNodeParser.createType(indexSignature.type!, context);
    }

    private getTypeId(node: ts.Node, context: Context): string {
        return `interface-${getKey(node, context)}`;
    }
}
