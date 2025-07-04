/* V28_comodato_rules.sql  
   Regras básicas para itens de comodato:
   1. is_comodato = true requer orcamento_id não nulo.
*/

ALTER TABLE item_estoque
  ADD CONSTRAINT chk_comodato_orcamento
  CHECK (is_comodato = false OR orcamento_id IS NOT NULL); 