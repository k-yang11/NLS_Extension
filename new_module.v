// A 3x3 systolic array for matrix multiplication in Verilog
// This module is designed to perform matrix multiplication using a systolic array architecture
// The systolic array consists of Processing Elements (PE) arranged in a 3x3 grid

module systolic_array_3x3(
    input clk,         // Clock signal
    input rst,         // Reset signal
    input [7:0] a[0:2][0:2],  // Input matrix A (3x3) with 8-bit elements
    input [7:0] b[0:2][0:2],  // Input matrix B (3x3) with 8-bit elements
    output [15:0] c[0:2][0:2] // Output matrix C (3x3) with 16-bit elements for products
);

// Intermediate wires for passing data between processing elements
wire [7:0] a_wire[0:2][0:2];
wire [7:0] b_wire[0:2][0:2];
wire [15:0] c_wire[0:2][0:2];

// Generate 3x3 grid of processing elements
genvar i, j;
generate
    for (i = 0; i < 3; i = i + 1) begin: row
        for (j = 0; j < 3; j = j + 1) begin: col
            // Each processing element
            processing_element PE (
                .clk(clk),
                .rst(rst),
                .a_in((i == 0) ? a[i][j] : a_wire[i-1][j]),  // Input A comes from the previous row or external input
                .b_in((j == 0) ? b[i][j] : b_wire[i][j-1]),  // Input B comes from the previous column or external input
                .a_out(a_wire[i][j]),                        // Output A to the next row
                .b_out(b_wire[i][j]),                        // Output B to the next column
                .c_in((i == 0 || j == 0) ? 16'd0 : c_wire[i-1][j-1]), // Input C from the top-left diagonal PE
                .c_out(c_wire[i][j])                         // Output C to the current position in matrix C
            );
        end
    end
endgenerate

// Assign the final output from the processing elements to the output matrix C
assign c[0][0] = c_wire[0][0];
assign c[0][1] = c_wire[0][1];
assign c[0][2] = c_wire[0][2];
assign c[1][0] = c_wire[1][0];
assign c[1][1] = c_wire[1][1];
assign c[1][2] = c_wire[1][2];
assign c[2][0] = c_wire[2][0];
assign c[2][1] = c_wire[2][1];
assign c[2][2] = c_wire[2][2];

endmodule

// Processing Element (PE) module
// Each PE takes input values, performs multiplication and accumulation, and passes data to the next PE
module processing_element(
    input clk,             // Clock signal
    input rst,             // Reset signal
    input [7:0] a_in,      // Input A
    input [7:0] b_in,      // Input B
    output [7:0] a_out,    // Output A
    output [7:0] b_out,    // Output B
    input [15:0] c_in,     // Input C for accumulation
    output reg [15:0] c_out // Output C
);

// Register to hold the values of A and B for passing to the next PE
reg [7:0] a_reg, b_reg;

// Sequential logic for the Processing Element
always @(posedge clk or posedge rst) begin
    if (rst) begin
        // Reset the registers and output to initial values
        a_reg <= 8'd0;
        b_reg <= 8'd0;
        c_out <= 16'd0;
    end else begin
        // Pass the inputs to the outputs
        a_reg <= a_in;
        b_reg <= b_in;
        // Perform multiplication and accumulation
        c_out <= c_in + (a_in * b_in);
    end
end

// Assign the registered values to the outputs
assign a_out = a_reg;
assign b_out = b_reg;

endmodule
//