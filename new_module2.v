// 3x3 Systolic Array Module
// This module defines a 3x3 systolic array for matrix multiplication.
// Each Processing Element (PE) in the array computes partial products and accumulates them.

module systolic_array_3x3 (
    input clk,                               // Clock signal
    input rst,                               // Reset signal
    input [7:0] a [0:2][0:2],                // 3x3 matrix A inputs
    input [7:0] b [0:2][0:2],                // 3x3 matrix B inputs
    output reg [15:0] c [0:2][0:2]           // 3x3 matrix C outputs (results)
);

    // Define Processing Elements (PE) as a 3x3 grid
    reg [7:0] a_reg [0:2][0:2];              // Registers to hold input matrix A
    reg [7:0] b_reg [0:2][0:2];              // Registers to hold input matrix B
    reg [15:0] p_reg [0:2][0:2];             // Registers to hold partial products

    integer i, j;                            // Iterators for loops

    // Reset or initialize the PEs
    always @(posedge clk or posedge rst) begin
        if (rst) begin
            // Initialize all outputs and registers to zero on reset
            for (i = 0; i < 3; i = i + 1) begin
                for (j = 0; j < 3; j = j + 1) begin
                    a_reg[i][j] <= 8'b0;
                    b_reg[i][j] <= 8'b0;
                    p_reg[i][j] <= 16'b0;
                    c[i][j] <= 16'b0;
                end
            end
        end else begin
            // Shift inputs through the systolic array
            for (i = 0; i < 3; i = i + 1) begin
                for (j = 0; j < 3; j = j + 1) begin
                    if (j == 0) begin
                        a_reg[i][j] <= a[i][j];
                    end else begin
                        a_reg[i][j] <= a_reg[i][j-1];
                    end

                    if (i == 0) begin
                        b_reg[i][j] <= b[i][j];
                    end else begin
                        b_reg[i][j] <= b_reg[i-1][j];
                    end
                end
            end

            // Compute partial products and accumulate
            for (i = 0; i < 3; i = i + 1) begin
                for (j = 0; j < 3; j = j + 1) begin
                    if (i == 0 && j == 0) begin
                        p_reg[i][j] <= a_reg[i][j] * b_reg[i][j];
                    end else if (i == 0) begin
                        p_reg[i][j] <= p_reg[i][j-1] + a_reg[i][j] * b_reg[i][j];
                    end else if (j == 0) begin
                        p_reg[i][j] <= p_reg[i-1][j] + a_reg[i][j] * b_reg[i][j];
                    end else begin
                        p_reg[i][j] <= p_reg[i-1][j] + p_reg[i][j-1] - p_reg[i-1][j-1] + a_reg[i][j] * b_reg[i][j];
                    end

                    // Update output matrix C
                    c[i][j] <= p_reg[i][j];
                end
            end
        end
    end

endmodule